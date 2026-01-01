from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


JsonValue = dict[str, Any] | list[Any]


class BusinessProfileVersionCreate(BaseModel):
    parent_version_id: int | None = None
    name: str | None = None
    description: str | None = None
    profile_data: JsonValue | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None
    status: str | None = None


class BusinessProfileVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_version_id: int | None
    name: str | None
    description: str | None
    profile_data: JsonValue | None
    created_by: str
    source_run_id: str | None
    commit_classification: str
    status: str
    created_at: datetime


class SiteStructureVersionCreate(BaseModel):
    parent_version_id: int | None = None
    business_profile_version_id: int | None = None
    structure_data: JsonValue | None = None
    selection_rules: JsonValue | None = None
    taxonomy_snapshot_id: int | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None
    status: str | None = None


class SiteStructureVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_version_id: int | None
    business_profile_version_id: int | None
    structure_data: JsonValue | None
    selection_rules: JsonValue | None
    taxonomy_snapshot_id: int | None
    created_by: str
    source_run_id: str | None
    commit_classification: str
    status: str
    created_at: datetime


class PageConfigVersionCreate(BaseModel):
    parent_version_id: int | None = None
    site_structure_version_id: int | None = None
    page_id: str
    config_data: JsonValue | None = None
    selection_rules: JsonValue | None = None
    taxonomy_snapshot_id: int | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None
    status: str | None = None


class PageConfigVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_version_id: int | None
    site_structure_version_id: int | None
    page_id: str
    config_data: JsonValue | None
    selection_rules: JsonValue | None
    taxonomy_snapshot_id: int | None
    created_by: str
    source_run_id: str | None
    commit_classification: str
    status: str
    created_at: datetime


class TaxonomySnapshotCreate(BaseModel):
    snapshot_data: JsonValue | None = None
    record_metadata: JsonValue | None = None
    created_by: str | None = None
    source_run_id: str | None = None


class TaxonomySnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    snapshot_data: JsonValue | None
    record_metadata: JsonValue | None
    created_by: str
    source_run_id: str | None
    created_at: datetime
