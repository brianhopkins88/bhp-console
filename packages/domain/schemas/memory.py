from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=50)
    source_types: list[str] | None = None


class MemorySearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_type: str
    source_id: str
    content: str
    score: float
    record_metadata: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
