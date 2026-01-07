from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GuardrailScope(BaseModel):
    agent: str | None = None
    task_type: str | None = None
    page_type: str | None = None
    content_block_type: str | None = None


class GuardrailCreate(BaseModel):
    guardrail_id: str | None = None
    title: str
    statement: str
    scope: GuardrailScope | None = None
    status: str | None = None
    created_by: str | None = None


class GuardrailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    guardrail_id: str
    version: int
    title: str
    statement: str
    scope: dict | None
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime | None = None


class GuardrailSearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=50)
    status: str | None = "active"
    agent: str | None = None
    task_type: str | None = None
    page_type: str | None = None
    content_block_type: str | None = None


class GuardrailSearchResult(BaseModel):
    guardrail: GuardrailOut
    score: float


class GuardrailSearchResponse(BaseModel):
    results: list[GuardrailSearchResult]


class AgentPromptCreate(BaseModel):
    agent_name: str
    prompt_text: str
    status: str | None = None
    created_by: str | None = None


class AgentPromptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_name: str
    version: int
    prompt_text: str
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime | None = None


class EvaluationRunCreate(BaseModel):
    agent_name: str | None = None
    input_text: str
    guardrail_query: str | None = None
    prompt_version_id: int | None = None
    top_k: int = Field(default=5, ge=1, le=50)
    run_model: bool = False
    model_name: str | None = None
    output_text: str | None = None
    metrics: dict | None = None
    created_by: str | None = None


class EvaluationRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_name: str | None
    input_text: str
    guardrail_query: str | None
    prompt_version_id: int | None
    guardrail_version_ids: list[int] | None
    retrieved_guardrails: list[dict] | None
    output_text: str | None
    metrics: dict | None
    status: str
    created_by: str
    created_at: datetime
    completed_at: datetime | None = None


class EvaluationRunResponse(BaseModel):
    evaluation: EvaluationRunOut
    guardrails: list[GuardrailSearchResult]
    prompt_text: str | None = None
    model_output: str | None = None
