from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ToolExecuteRequest(BaseModel):
    run_id: str = Field(..., min_length=1)
    tool_name: str = Field(..., min_length=1)
    input: dict[str, Any]
    step_id: int | None = None
    requester: str | None = None
    correlation_id: str | None = None
    approval_id: int | None = None


class ToolExecuteResponse(BaseModel):
    status: str
    tool_call_id: int
    output: dict[str, Any] | None = None
    approval_id: int | None = None
    reason: str | None = None
