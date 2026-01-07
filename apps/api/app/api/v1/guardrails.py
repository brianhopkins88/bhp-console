from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from openai import OpenAI
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import get_db
from app.services.memory import search_memory, upsert_embedding
from packages.domain.models.guardrails import (
    AgentPromptVersion,
    EvaluationRun,
    GuardrailStatementVersion,
)
from packages.domain.schemas.guardrails import (
    AgentPromptCreate,
    AgentPromptOut,
    EvaluationRunCreate,
    EvaluationRunOut,
    EvaluationRunResponse,
    GuardrailCreate,
    GuardrailOut,
    GuardrailSearchRequest,
    GuardrailSearchResponse,
    GuardrailSearchResult,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _next_guardrail_version(db: Session, guardrail_id: str) -> int:
    stmt = select(func.max(GuardrailStatementVersion.version)).where(
        GuardrailStatementVersion.guardrail_id == guardrail_id
    )
    max_version = db.execute(stmt).scalar_one()
    return int(max_version or 0) + 1


def _next_prompt_version(db: Session, agent_name: str) -> int:
    stmt = select(func.max(AgentPromptVersion.version)).where(
        AgentPromptVersion.agent_name == agent_name
    )
    max_version = db.execute(stmt).scalar_one()
    return int(max_version or 0) + 1


def _scope_matches(
    scope: dict | None,
    agent: str | None,
    task_type: str | None,
    page_type: str | None,
    content_block_type: str | None,
) -> bool:
    if agent and (scope or {}).get("agent") != agent:
        return False
    if task_type and (scope or {}).get("task_type") != task_type:
        return False
    if page_type and (scope or {}).get("page_type") != page_type:
        return False
    if content_block_type and (scope or {}).get("content_block_type") != content_block_type:
        return False
    return True


def _embed_guardrail(db: Session, guardrail: GuardrailStatementVersion) -> None:
    scope = guardrail.scope or {}
    payload = json.dumps(
        {
            "title": guardrail.title,
            "statement": guardrail.statement,
            "scope": scope,
        },
        sort_keys=True,
    )
    upsert_embedding(
        db,
        source_type="guardrail",
        source_id=str(guardrail.id),
        content=payload,
        record_metadata={
            "guardrail_id": guardrail.guardrail_id,
            "version": guardrail.version,
            "status": guardrail.status,
            "title": guardrail.title,
            "scope": scope,
        },
    )


def _build_evaluation_prompt(
    prompt: AgentPromptVersion | None,
    guardrails: list[GuardrailStatementVersion],
    input_text: str,
) -> str:
    base = prompt.prompt_text if prompt else ""
    guardrail_lines = "\n".join(f"- {rule.statement}" for rule in guardrails)
    if guardrail_lines:
        guardrail_block = f"Guardrails:\n{guardrail_lines}\n\n"
    else:
        guardrail_block = ""
    return f"{base}\n\n{guardrail_block}Input:\n{input_text}".strip()


def _extract_response_text(response: object) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text
    output = getattr(response, "output", None)
    if isinstance(output, list):
        for item in output:
            content = item.get("content") if isinstance(item, dict) else None
            if isinstance(content, list):
                for chunk in content:
                    text = chunk.get("text") if isinstance(chunk, dict) else None
                    if text:
                        return text
    return ""


def _run_model(prompt_text: str, model_name: str | None) -> str:
    if not settings.openai_api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key missing")

    verify = True
    if settings.openai_ca_bundle:
        if os.path.exists(settings.openai_ca_bundle):
            verify = settings.openai_ca_bundle
        else:
            logger.warning("OpenAI CA bundle not found at %s", settings.openai_ca_bundle)

    http_client = httpx.Client(verify=verify, timeout=30.0)
    client = OpenAI(api_key=settings.openai_api_key, http_client=http_client)
    try:
        response = client.responses.create(
            model=model_name or settings.openai_tagging_model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": prompt_text,
                        }
                    ],
                }
            ],
        )
    finally:
        http_client.close()
    return _extract_response_text(response)


@router.post("/guardrails", response_model=GuardrailOut)
def create_guardrail(
    payload: GuardrailCreate,
    db: Session = Depends(get_db),
) -> GuardrailStatementVersion:
    guardrail_id = payload.guardrail_id or str(uuid4())
    version = _next_guardrail_version(db, guardrail_id)
    scope = payload.scope.model_dump() if payload.scope else None
    guardrail = GuardrailStatementVersion(
        guardrail_id=guardrail_id,
        version=version,
        title=payload.title,
        statement=payload.statement,
        scope=scope,
        status=payload.status or "active",
        created_by=payload.created_by or "user",
    )
    db.add(guardrail)
    db.commit()
    db.refresh(guardrail)
    _embed_guardrail(db, guardrail)
    return guardrail


@router.get("/guardrails", response_model=list[GuardrailOut])
def list_guardrails(
    guardrail_id: str | None = None,
    status: str | None = None,
    agent: str | None = None,
    task_type: str | None = None,
    page_type: str | None = None,
    content_block_type: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[GuardrailStatementVersion]:
    stmt = select(GuardrailStatementVersion).order_by(
        GuardrailStatementVersion.created_at.desc()
    )
    if guardrail_id:
        stmt = stmt.where(GuardrailStatementVersion.guardrail_id == guardrail_id)
    if status:
        stmt = stmt.where(GuardrailStatementVersion.status == status)
    rows = db.execute(stmt.limit(limit)).scalars().all()
    if not (agent or task_type or page_type or content_block_type):
        return rows
    return [
        row
        for row in rows
        if _scope_matches(row.scope, agent, task_type, page_type, content_block_type)
    ]


@router.get("/guardrails/{guardrail_id}/latest", response_model=GuardrailOut | None)
def get_latest_guardrail(
    guardrail_id: str,
    db: Session = Depends(get_db),
) -> GuardrailStatementVersion | None:
    stmt = (
        select(GuardrailStatementVersion)
        .where(GuardrailStatementVersion.guardrail_id == guardrail_id)
        .order_by(GuardrailStatementVersion.version.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


@router.post("/guardrails/search", response_model=GuardrailSearchResponse)
def search_guardrails(
    payload: GuardrailSearchRequest,
    db: Session = Depends(get_db),
) -> GuardrailSearchResponse:
    try:
        results = search_memory(
            db,
            query=payload.query,
            top_k=payload.top_k,
            source_types=["guardrail"],
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    matches: list[GuardrailSearchResult] = []
    for record, score in results:
        try:
            guardrail_id = int(record.source_id)
        except (TypeError, ValueError):
            continue
        guardrail = db.get(GuardrailStatementVersion, guardrail_id)
        if not guardrail:
            continue
        if payload.status and guardrail.status != payload.status:
            continue
        if not _scope_matches(
            guardrail.scope,
            payload.agent,
            payload.task_type,
            payload.page_type,
            payload.content_block_type,
        ):
            continue
        matches.append(GuardrailSearchResult(guardrail=guardrail, score=score))
    return GuardrailSearchResponse(results=matches)


@router.post("/prompts", response_model=AgentPromptOut)
def create_prompt(
    payload: AgentPromptCreate,
    db: Session = Depends(get_db),
) -> AgentPromptVersion:
    version = _next_prompt_version(db, payload.agent_name)
    prompt = AgentPromptVersion(
        agent_name=payload.agent_name,
        version=version,
        prompt_text=payload.prompt_text,
        status=payload.status or "active",
        created_by=payload.created_by or "user",
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("/prompts", response_model=list[AgentPromptOut])
def list_prompts(
    agent_name: str | None = None,
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[AgentPromptVersion]:
    stmt = select(AgentPromptVersion).order_by(AgentPromptVersion.created_at.desc())
    if agent_name:
        stmt = stmt.where(AgentPromptVersion.agent_name == agent_name)
    if status:
        stmt = stmt.where(AgentPromptVersion.status == status)
    return db.execute(stmt.limit(limit)).scalars().all()


@router.get("/prompts/{agent_name}/latest", response_model=AgentPromptOut | None)
def get_latest_prompt(
    agent_name: str,
    db: Session = Depends(get_db),
) -> AgentPromptVersion | None:
    stmt = (
        select(AgentPromptVersion)
        .where(AgentPromptVersion.agent_name == agent_name)
        .order_by(AgentPromptVersion.version.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


@router.post("/guardrails/evaluate", response_model=EvaluationRunResponse)
def evaluate_guardrails(
    payload: EvaluationRunCreate,
    db: Session = Depends(get_db),
) -> EvaluationRunResponse:
    prompt: AgentPromptVersion | None = None
    if payload.prompt_version_id is not None:
        prompt = db.get(AgentPromptVersion, payload.prompt_version_id)
        if prompt is None:
            raise HTTPException(status_code=404, detail="Prompt version not found")
    elif payload.agent_name:
        stmt = (
            select(AgentPromptVersion)
            .where(
                AgentPromptVersion.agent_name == payload.agent_name,
                AgentPromptVersion.status == "active",
            )
            .order_by(AgentPromptVersion.version.desc())
            .limit(1)
        )
        prompt = db.execute(stmt).scalar_one_or_none()

    query = payload.guardrail_query or payload.input_text
    search_payload = GuardrailSearchRequest(
        query=query,
        top_k=payload.top_k,
        agent=payload.agent_name,
    )
    search_results = search_guardrails(search_payload, db=db).results
    guardrail_versions = [result.guardrail for result in search_results]

    prompt_text = _build_evaluation_prompt(prompt, guardrail_versions, payload.input_text)
    output_text = payload.output_text
    if payload.run_model:
        output_text = _run_model(prompt_text, payload.model_name)

    retrieved = [
        {
            "id": result.guardrail.id,
            "guardrail_id": result.guardrail.guardrail_id,
            "version": result.guardrail.version,
            "title": result.guardrail.title,
            "score": result.score,
        }
        for result in search_results
    ]

    evaluation = EvaluationRun(
        agent_name=payload.agent_name,
        input_text=payload.input_text,
        guardrail_query=query,
        prompt_version_id=prompt.id if prompt else None,
        guardrail_version_ids=[rule.id for rule in guardrail_versions],
        retrieved_guardrails=retrieved,
        output_text=output_text,
        metrics=payload.metrics,
        status="completed" if output_text or not payload.run_model else "failed",
        created_by=payload.created_by or "user",
        completed_at=datetime.now(timezone.utc),
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    return EvaluationRunResponse(
        evaluation=evaluation,
        guardrails=search_results,
        prompt_text=prompt_text,
        model_output=output_text if payload.run_model else None,
    )


@router.get("/guardrails/evaluations", response_model=list[EvaluationRunOut])
def list_evaluations(
    agent_name: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[EvaluationRun]:
    stmt = select(EvaluationRun).order_by(EvaluationRun.created_at.desc())
    if agent_name:
        stmt = stmt.where(EvaluationRun.agent_name == agent_name)
    return db.execute(stmt.limit(limit)).scalars().all()
