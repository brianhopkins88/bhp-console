from __future__ import annotations

import base64
import io
import json
import logging
import os
from datetime import datetime, timezone
from typing import Iterable

import httpx
from PIL import Image
from openai import OpenAI
from sqlalchemy import delete, select

from app.core.settings import settings
from app.db.session import SessionLocal
from packages.domain.models.assets import Asset, AssetAutoTagJob, AssetTag, TagTaxonomy
from app.services.openai_usage import increment_usage

logger = logging.getLogger(__name__)

SERVICE_TAGS = [
    "family",
    "portrait",
    "party",
    "graduation",
    "commercial",
    "wildlife",
    "travel",
]


def set_autotag_job_status(
    db,
    asset_id: str,
    status: str,
    error_message: str | None = None,
    started: bool = False,
    completed: bool = False,
) -> AssetAutoTagJob:
    job = db.execute(
        select(AssetAutoTagJob).where(AssetAutoTagJob.asset_id == asset_id)
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if job is None:
        job = AssetAutoTagJob(asset_id=asset_id, status=status)
        db.add(job)
    job.status = status
    job.error_message = error_message
    job.updated_at = now
    if started:
        job.started_at = now
    if completed:
        job.completed_at = now
    db.commit()
    db.refresh(job)
    return job


def queue_auto_tagging_job(asset_id: str) -> None:
    run_auto_tagging_job(asset_id)


def run_auto_tagging_job(asset_id: str) -> None:
    db = SessionLocal()
    try:
        asset = db.get(Asset, asset_id)
        if not asset:
            set_autotag_job_status(db, asset_id, "failed", error_message="Asset not found")
            return

        set_autotag_job_status(db, asset_id, "running", started=True)

        _ensure_base_taxonomy(db)
        approved_tags = _list_approved_tags(db)
        if not settings.openai_api_key:
            logger.warning("OpenAI API key missing; auto-tagging skipped.")
            set_autotag_job_status(
                db,
                asset_id,
                "failed",
                error_message="OpenAI API key missing",
                completed=True,
            )
            return

        image_data_url = _build_image_data_url(
            asset.original_path, max_width=settings.openai_tagging_image_max_width
        )

        response = _request_tagging(
            image_data_url=image_data_url,
            allowed_tags=approved_tags,
        )
        _record_usage(db, response)
        service_tags, suggested_tags = _parse_tagging_response(response, approved_tags)

        db.execute(
            delete(AssetTag).where(
                AssetTag.asset_id == asset_id,
                AssetTag.source == "auto",
            )
        )
        for tag in service_tags:
            db.add(
                AssetTag(
                    asset_id=asset_id,
                    tag=tag["tag"],
                    source="auto",
                    confidence=tag["confidence"],
                )
            )

        for tag in suggested_tags:
            _upsert_taxonomy(db, tag, status="pending")

        db.commit()
        set_autotag_job_status(db, asset_id, "completed", completed=True)
    except Exception as exc:
        db.rollback()
        logger.exception("Auto-tagging failed for asset %s", asset_id)
        error_text = f"{exc.__class__.__name__}: {exc}"
        if len(error_text) > 300:
            error_text = error_text[:300] + "..."
        set_autotag_job_status(
            db,
            asset_id,
            "failed",
            error_message=error_text,
            completed=True,
        )
    finally:
        db.close()


def _build_image_data_url(path: str, max_width: int) -> str:
    with Image.open(path) as image:
        image = image.convert("RGB")
        if image.width > max_width:
            height = int(round(image.height * (max_width / image.width)))
            image = image.resize((max_width, height), Image.LANCZOS)

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=72, optimize=True)
        payload = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{payload}"


def _request_tagging(image_data_url: str, allowed_tags: Iterable[str]) -> dict:
    verify = True
    if settings.openai_ca_bundle:
        if os.path.exists(settings.openai_ca_bundle):
            verify = settings.openai_ca_bundle
        else:
            logger.warning("OpenAI CA bundle not found at %s", settings.openai_ca_bundle)

    http_client = httpx.Client(verify=verify, timeout=30.0)
    client = OpenAI(api_key=settings.openai_api_key, http_client=http_client)
    allowed_list = sorted(set(allowed_tags))
    prompt = (
        "You are a photo tagging assistant. "
        "Classify the image into service tags and suggest any additional tags. "
        "Use only tags from the allowed list for service_tags. "
        "Portraits should only be used for single individuals or couples where the photo is focused on faces. "
        "Return JSON that matches the schema."
    )

    schema = {
        "type": "object",
        "properties": {
            "service_tags": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "tag": {"type": "string"},
                        "confidence": {"type": "number"},
                    },
                    "required": ["tag", "confidence"],
                    "additionalProperties": False,
                },
            },
            "suggested_tags": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["service_tags", "suggested_tags"],
        "additionalProperties": False,
    }

    try:
        response = client.responses.create(
            model=settings.openai_tagging_model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                f"{prompt}\n\n"
                                f"Allowed tags: {', '.join(allowed_list)}\n"
                                f"Prompt version: {settings.openai_tagging_prompt_version}\n"
                                f"Schema version: {settings.openai_tagging_schema_version}\n"
                            ),
                        },
                        {"type": "input_image", "image_url": image_data_url},
                    ],
                }
            ],
            text={"format": {"type": "json_schema", "name": "tagging", "schema": schema}},
        )
    finally:
        if http_client is not None:
            http_client.close()

    payload = _extract_response_text(response)
    return json.loads(payload) if payload else {"service_tags": [], "suggested_tags": []}


def _record_usage(db, response: object) -> None:
    usage = getattr(response, "usage", None)
    if usage is None and isinstance(response, dict):
        usage = response.get("usage")
    if not usage:
        return
    total_tokens = getattr(usage, "total_tokens", None)
    if total_tokens is None and isinstance(usage, dict):
        total_tokens = usage.get("total_tokens")
    if isinstance(total_tokens, int):
        increment_usage(db, total_tokens)


def _extract_response_text(response: object) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text

    output = getattr(response, "output", None)
    if not output:
        return ""

    for item in output:
        content = getattr(item, "content", None)
        if content is None and isinstance(item, dict):
            content = item.get("content")
        if not content:
            continue
        for chunk in content:
            chunk_type = getattr(chunk, "type", None)
            if chunk_type is None and isinstance(chunk, dict):
                chunk_type = chunk.get("type")
            if chunk_type == "output_text":
                text = getattr(chunk, "text", "")
                if not text and isinstance(chunk, dict):
                    text = chunk.get("text", "")
                if text:
                    return text
    return ""


def _parse_tagging_response(payload: dict, allowed_tags: Iterable[str]) -> tuple[list[dict], list[str]]:
    allowed = {tag.strip().lower() for tag in allowed_tags}
    service_tags: list[dict] = []
    for item in payload.get("service_tags", []):
        tag = _normalize_tag(str(item.get("tag", "")))
        if not tag or tag not in allowed:
            continue
        confidence = float(item.get("confidence", 0.5))
        confidence = max(0.0, min(confidence, 1.0))
        service_tags.append({"tag": tag, "confidence": confidence})

    suggested: list[str] = []
    for raw in payload.get("suggested_tags", []):
        tag = _normalize_tag(str(raw))
        if tag and tag not in allowed:
            suggested.append(tag)

    return service_tags, sorted(set(suggested))


def _normalize_tag(tag: str) -> str:
    cleaned = "".join(
        ch if ch.isalnum() or ch in {".", "-", " "} else " " for ch in tag.lower()
    )
    return "-".join(cleaned.split()).strip("-")


def _ensure_base_taxonomy(db) -> None:
    existing = set(
        db.execute(select(TagTaxonomy.tag)).scalars().all()
    )
    now = datetime.now(timezone.utc)
    for tag in SERVICE_TAGS:
        if tag in existing:
            continue
        db.add(TagTaxonomy(tag=tag, status="approved", approved_at=now))
    db.commit()


def _list_approved_tags(db) -> list[str]:
    tags = db.execute(
        select(TagTaxonomy.tag).where(TagTaxonomy.status == "approved")
    ).scalars()
    return sorted(set(tags))


def _upsert_taxonomy(db, tag: str, status: str) -> None:
    _ensure_parent_taxonomy(db, tag, status=status)
    existing = db.execute(
        select(TagTaxonomy).where(TagTaxonomy.tag == tag)
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if existing:
        if existing.status != status:
            existing.status = status
            if status == "approved":
                existing.approved_at = now
    else:
        taxonomy = TagTaxonomy(tag=tag, status=status)
        if status == "approved":
            taxonomy.approved_at = now
        db.add(taxonomy)


def _ensure_parent_taxonomy(db, tag: str, status: str) -> None:
    if "." not in tag:
        return
    parts = [part for part in tag.split(".") if part]
    if len(parts) < 2:
        return
    now = datetime.now(timezone.utc)
    for i in range(1, len(parts)):
        parent = ".".join(parts[:i])
        existing = db.execute(
            select(TagTaxonomy).where(TagTaxonomy.tag == parent)
        ).scalar_one_or_none()
        if existing:
            if status == "approved" and existing.status != "approved":
                existing.status = "approved"
                existing.approved_at = now
            continue
        taxonomy = TagTaxonomy(tag=parent, status=status)
        if status == "approved":
            taxonomy.approved_at = now
        db.add(taxonomy)
