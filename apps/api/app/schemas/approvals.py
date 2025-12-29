from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


JsonValue = dict[str, Any] | list[Any]


class ApprovalCreate(BaseModel):
    action: str
    proposal: JsonValue | None = None
    requester: str
    run_id: str | None = None
    tool_call_id: int | None = None


class ApprovalDecision(BaseModel):
    status: str
    decided_by: str | None = None
    decision_notes: str | None = None
    outcome: JsonValue | None = None


class ApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    proposal: JsonValue | None
    requester: str
    status: str
    decided_by: str | None
    decision_notes: str | None
    outcome: JsonValue | None
    run_id: str | None
    tool_call_id: int | None
    created_at: datetime
    decided_at: datetime | None
