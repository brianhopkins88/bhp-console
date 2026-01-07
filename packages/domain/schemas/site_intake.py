from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


JsonValue = dict[str, Any] | list[Any]


class BusinessProfileCreate(BaseModel):
    name: str | None = None
    description: str | None = None
    profile_data: JsonValue | None = None
    status: str | None = None
    force_new: bool | None = None
    parent_version_id: int | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None


class BusinessProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_version_id: int | None = None
    name: str | None
    description: str | None
    profile_data: JsonValue | None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None
    approved_at: datetime | None = None


class SiteStructureCreate(BaseModel):
    status: str | None = None
    structure_data: JsonValue | None = None
    selection_rules: JsonValue | None = None
    taxonomy_snapshot_id: int | None = None
    business_profile_version_id: int | None = None
    force_new: bool | None = None
    parent_version_id: int | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None


class SiteStructureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_version_id: int | None = None
    business_profile_version_id: int | None = None
    status: str
    structure_data: JsonValue | None
    selection_rules: JsonValue | None = None
    taxonomy_snapshot_id: int | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None
    created_at: datetime
    approved_at: datetime | None = None


class TopicTaxonomyCreate(BaseModel):
    status: str | None = None
    taxonomy_data: JsonValue | None = None
    force_new: bool | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None


class TopicTaxonomyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    taxonomy_data: JsonValue | None
    created_at: datetime
    approved_at: datetime | None


class TopicTaxonomyChangeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    taxonomy_id: int | None
    status: str
    change_type: str
    taxonomy_data: JsonValue | None
    created_by: str
    source_run_id: str | None
    created_at: datetime


class TopicTaxonomyRestoreRequest(BaseModel):
    change_id: int
    status: str | None = None
    force_new: bool | None = None
    created_by: str | None = None
    source_run_id: str | None = None
    commit_classification: str | None = None


class BusinessProfileInput(BaseModel):
    services: list[str]
    delivery_methods: list[str]
    pricing_models: list[str]
    pricing_notes: str | None = None
    subjects: list[str]
    location: str | None = None
    target_audience: str | None = None
    brand_voice: str | None = None
    notes: str | None = None


class SitePage(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    parent_id: str | None = None
    order: int
    status: str
    template_id: str | None = None
    service_type: str | None = None


class SiteStructurePayload(BaseModel):
    pages: list[SitePage]


class TopicTag(BaseModel):
    id: str
    label: str
    parent_id: str | None = None


class TopicTaxonomyPayload(BaseModel):
    tags: list[TopicTag]


class SiteIntakeProposalRequest(BaseModel):
    business_profile: BusinessProfileInput
    site_structure: SiteStructurePayload | None = None
    changes_requested: str | None = None


class SiteIntakeProposalOut(BaseModel):
    business_profile: BusinessProfileInput
    site_structure: SiteStructurePayload
    topic_taxonomy: TopicTaxonomyPayload
    review: dict | None = None
    metadata: dict | None = None


class SiteIntakeApproveRequest(BaseModel):
    business_profile: BusinessProfileInput
    site_structure: SiteStructurePayload
    topic_taxonomy: TopicTaxonomyPayload


class SiteIntakeApprovalResponse(BaseModel):
    business_profile: BusinessProfileOut
    site_structure: SiteStructureOut
    topic_taxonomy: TopicTaxonomyOut


class SiteIntakeState(BaseModel):
    business_profile: BusinessProfileOut | None
    site_structure: SiteStructureOut | None
    topic_taxonomy: TopicTaxonomyOut | None
    business_profile_history: list[BusinessProfileOut]
    site_structure_history: list[SiteStructureOut]
    topic_taxonomy_history: list[TopicTaxonomyOut]


class SiteStructureChangeRequest(BaseModel):
    change_request: str
    structure: SiteStructurePayload | None = None


class SiteStructureChangeResponse(BaseModel):
    structure: SiteStructurePayload
    summary: list[str]
