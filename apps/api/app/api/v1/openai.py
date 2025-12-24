from __future__ import annotations

import os
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import get_db
from app.services.openai_usage import get_usage, reset_usage

router = APIRouter()


@router.get("/openai/usage")
def read_openai_usage(db: Session = Depends(get_db)) -> dict:
    usage = get_usage(db)
    return {
        "total_tokens": usage.total_tokens,
        "updated_at": usage.updated_at,
        "last_reset_at": usage.last_reset_at,
        "token_budget": settings.openai_token_budget,
    }


@router.post("/openai/usage/reset")
def reset_openai_usage(db: Session = Depends(get_db)) -> dict:
    usage = reset_usage(db)
    return {
        "total_tokens": usage.total_tokens,
        "updated_at": usage.updated_at,
        "last_reset_at": usage.last_reset_at,
        "token_budget": settings.openai_token_budget,
    }


@router.get("/openai/balance")
def read_openai_balance() -> dict:
    if not settings.openai_api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")

    verify = settings.openai_ca_bundle if settings.openai_ca_bundle and os.path.exists(settings.openai_ca_bundle) else True
    try:
        with httpx.Client(verify=verify, timeout=10.0) as client:
            response = client.get(
                "https://api.openai.com/v1/dashboard/billing/credit_grants",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI balance request failed: {exc.__class__.__name__}",
        ) from exc
    if not response.is_success:
        snippet = response.text[:200].strip()
        detail = f"OpenAI balance error {response.status_code}"
        if snippet:
            detail = f"{detail}: {snippet}"
        raise HTTPException(status_code=502, detail=detail)

    payload = response.json()
    return {
        "total_granted": payload.get("total_granted"),
        "total_used": payload.get("total_used"),
        "total_available": payload.get("total_available"),
        "expires_at": _format_expires(payload.get("expires_at")),
    }


def _format_expires(value: object) -> str | None:
    if value is None:
        return None
    try:
        return datetime.utcfromtimestamp(float(value)).isoformat() + "Z"
    except (TypeError, ValueError):
        return None
