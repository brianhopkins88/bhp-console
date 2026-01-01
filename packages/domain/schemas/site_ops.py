from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


JsonValue = dict[str, Any] | list[Any]


class SiteTestRunCreate(BaseModel):
    version: str
    environment: str | None = None
    status: str | None = None
    summary: str | None = None
    results: JsonValue | None = None
    record_metadata: dict[str, Any] | None = None


class SiteTestRunUpdate(BaseModel):
    status: str | None = None
    summary: str | None = None
    results: JsonValue | None = None
    record_metadata: dict[str, Any] | None = None


class SiteTestRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: str
    environment: str | None
    status: str
    summary: str | None
    results: JsonValue | None
    record_metadata: dict[str, Any] | None
    created_at: datetime
    completed_at: datetime | None


class SiteDeploymentCreate(BaseModel):
    environment: str
    version: str
    status: str | None = None
    record_metadata: dict[str, Any] | None = None


class SiteDeploymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    environment: str
    version: str
    status: str
    rollback_version: str | None
    record_metadata: dict[str, Any] | None
    created_at: datetime
    deployed_at: datetime | None
