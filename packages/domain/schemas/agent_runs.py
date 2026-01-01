from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


JsonValue = dict[str, Any] | list[Any]


class AgentRunCreate(BaseModel):
    goal: str | None = None
    plan: JsonValue | None = None
    run_metadata: dict[str, Any] | None = None


class AgentRunUpdate(BaseModel):
    status: str | None = None
    outcome: JsonValue | None = None
    error_message: str | None = None


class AgentStepCreate(BaseModel):
    index: int
    label: str
    status: str | None = None
    input: JsonValue | None = None


class AgentStepUpdate(BaseModel):
    status: str | None = None
    output: JsonValue | None = None
    error_message: str | None = None


class ToolCallCreate(BaseModel):
    step_id: int | None = None
    tool_name: str
    status: str | None = None
    correlation_id: str | None = None
    input: JsonValue | None = None
    output: JsonValue | None = None
    duration_ms: int | None = None
    error_message: str | None = None


class ToolCallUpdate(BaseModel):
    status: str | None = None
    output: JsonValue | None = None
    duration_ms: int | None = None
    error_message: str | None = None


class AgentStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: str
    index: int
    label: str
    status: str
    input: JsonValue | None
    output: JsonValue | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None


class ToolCallOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: str
    step_id: int | None
    tool_name: str
    status: str
    correlation_id: str | None
    input: JsonValue | None
    output: JsonValue | None
    error_message: str | None
    duration_ms: int | None
    created_at: datetime


class AgentRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal: str | None
    status: str
    plan: JsonValue | None
    run_metadata: dict[str, Any] | None
    outcome: JsonValue | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    steps: list[AgentStepOut] = []
    tool_calls: list[ToolCallOut] = []
