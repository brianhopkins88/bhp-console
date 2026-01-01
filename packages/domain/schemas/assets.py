from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AssetTagInput(BaseModel):
    tag: str
    source: str = "manual"
    confidence: float | None = None


class AssetRoleInput(BaseModel):
    role: str
    scope: str | None = None
    is_published: bool | None = None


class AssetRatingInput(BaseModel):
    rating: int = 0
    starred: bool = False


class AssetRolePublishInput(BaseModel):
    is_published: bool


class TagTaxonomyUpdate(BaseModel):
    status: str


class AssetFocalPointInput(BaseModel):
    x: float = Field(..., ge=0.0, le=1.0)
    y: float = Field(..., ge=0.0, le=1.0)


class AssetDerivativeRequest(BaseModel):
    ratios: list[str] | None = None
    widths: list[int] | None = None


class AssetTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tag: str
    source: str
    confidence: float | None


class AssetRoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role: str
    scope: str | None
    is_published: bool


class AssetAutoTagJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None


class AssetVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ratio: str
    width: int
    height: int
    format: str
    path: str
    version: int


class TagTaxonomyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tag: str
    status: str
    created_at: datetime
    approved_at: datetime | None


class AutoTagResponse(BaseModel):
    status: str


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_path: str
    original_filename: str
    mime_type: str
    width: int
    height: int
    focal_x: float
    focal_y: float
    rating: int
    starred: bool
    usage_count: int
    last_used_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[AssetTagOut] = []
    roles: list[AssetRoleOut] = []
    variants: list[AssetVariantOut] = []
