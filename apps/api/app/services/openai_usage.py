from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.openai_usage import OpenAIUsage


def get_usage(db: Session) -> OpenAIUsage:
    usage = db.execute(select(OpenAIUsage).where(OpenAIUsage.id == 1)).scalar_one_or_none()
    if usage is None:
        usage = OpenAIUsage(id=1, total_tokens=0)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    return usage


def increment_usage(db: Session, total_tokens: int) -> OpenAIUsage:
    usage = get_usage(db)
    usage.total_tokens += max(total_tokens, 0)
    db.commit()
    db.refresh(usage)
    return usage


def reset_usage(db: Session) -> OpenAIUsage:
    usage = get_usage(db)
    usage.total_tokens = 0
    usage.last_reset_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(usage)
    return usage
