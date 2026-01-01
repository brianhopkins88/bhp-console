from __future__ import annotations

import os
import shutil
from typing import Sequence
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import get_db
from packages.domain.models.assets import (
    Asset,
    AssetAutoTagJob,
    AssetRole,
    AssetTag,
    AssetVariant,
    TagTaxonomy,
)
from packages.domain.schemas.assets import (
    AssetDerivativeRequest,
    AssetAutoTagJobOut,
    AutoTagResponse,
    AssetFocalPointInput,
    AssetOut,
    AssetRatingInput,
    AssetRoleInput,
    AssetRolePublishInput,
    AssetTagInput,
    TagTaxonomyOut,
    TagTaxonomyUpdate,
)
from app.services.ai_tagging import queue_auto_tagging_job, set_autotag_job_status
from app.services.assets import ensure_dir, generate_variants

router = APIRouter()


def _get_asset_or_404(db: Session, asset_id: str) -> Asset:
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/assets", response_model=list[AssetOut])
def list_assets(
    db: Session = Depends(get_db),
    search: str | None = None,
    tags: list[str] | None = Query(None),
    roles: list[str] | None = Query(None),
    orientations: list[str] | None = Query(None),
    min_rating: int | None = None,
    starred: bool | None = None,
    sort: str | None = "newest",
) -> Sequence[Asset]:
    stmt = select(Asset)

    if search:
        term = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Asset.original_filename).like(term),
                Asset.tags.any(func.lower(AssetTag.tag).like(term)),
            )
        )

    if tags:
        stmt = stmt.where(Asset.tags.any(AssetTag.tag.in_(tags)))

    if roles:
        stmt = stmt.where(Asset.roles.any(AssetRole.role.in_(roles)))

    if orientations:
        orientation_filters = []
        if "square" in orientations:
            orientation_filters.append(Asset.width == Asset.height)
        if "landscape" in orientations:
            orientation_filters.append(Asset.width > Asset.height)
        if "portrait" in orientations:
            orientation_filters.append(Asset.height > Asset.width)
        if orientation_filters:
            stmt = stmt.where(or_(*orientation_filters))

    if min_rating is not None:
        stmt = stmt.where(Asset.rating >= min_rating)

    if starred is not None:
        stmt = stmt.where(Asset.starred == starred)

    if sort == "oldest":
        stmt = stmt.order_by(Asset.created_at.asc())
    elif sort == "rating":
        stmt = stmt.order_by(Asset.rating.desc())
    else:
        stmt = stmt.order_by(Asset.created_at.desc())

    return db.execute(stmt).scalars().all()


@router.get("/assets/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: str, db: Session = Depends(get_db)) -> Asset:
    return _get_asset_or_404(db, asset_id)


@router.get("/assets/{asset_id}/thumbnail")
def get_asset_thumbnail(asset_id: str, db: Session = Depends(get_db)) -> FileResponse:
    asset = _get_asset_or_404(db, asset_id)
    variant = _select_thumbnail_variant(asset)
    path = variant.path if variant else asset.original_path

    safe_path = os.path.realpath(path)
    storage_root = os.path.realpath(settings.assets_storage_root)
    if not safe_path.startswith(storage_root + os.sep) and safe_path != storage_root:
        raise HTTPException(status_code=400, detail="Invalid asset path")

    if not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="Asset file missing")

    return FileResponse(safe_path)


@router.get("/assets/{asset_id}/file")
def get_asset_file(asset_id: str, db: Session = Depends(get_db)) -> FileResponse:
    asset = _get_asset_or_404(db, asset_id)
    safe_path = _safe_storage_path(asset.original_path)
    if not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="Asset file missing")
    return FileResponse(safe_path)


@router.delete("/assets/{asset_id}/tags")
def delete_tag(asset_id: str, tag: str, source: str | None = None, db: Session = Depends(get_db)) -> dict:
    _get_asset_or_404(db, asset_id)
    stmt = delete(AssetTag).where(AssetTag.asset_id == asset_id, AssetTag.tag == tag)
    if source:
        stmt = stmt.where(AssetTag.source == source)
    db.execute(stmt)
    db.commit()
    return {"status": "deleted"}


@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: str, db: Session = Depends(get_db)) -> dict:
    asset = _get_asset_or_404(db, asset_id)
    has_hero_main = any(role.role == "hero_main" for role in asset.roles)
    has_published_logo = any(
        role.role == "logo" and role.is_published for role in asset.roles
    )
    has_published_showcase = any(
        role.role == "showcase" and role.is_published for role in asset.roles
    )
    if has_hero_main:
        raise HTTPException(
            status_code=400,
            detail="Hero main images cannot be deleted. Replace the hero main instead.",
        )
    if has_published_logo or has_published_showcase:
        raise HTTPException(
            status_code=400,
            detail="Published logo/showcase images cannot be deleted. Replace them first.",
        )
    original_path = asset.original_path
    asset_dir = os.path.join(settings.assets_derived_dir, asset.id)

    db.delete(asset)
    db.commit()

    _safe_delete_file(original_path)
    _safe_delete_tree(asset_dir)

    return {"status": "deleted"}


@router.post("/assets/upload", response_model=AssetOut)
async def upload_asset(
    file: UploadFile = File(...),
    generate_derivatives: bool = Form(True),
    tags: str | None = Form(None),
    db: Session = Depends(get_db),
) -> Asset:
    ensure_dir(settings.assets_originals_dir)

    filename = file.filename or "upload"
    _, ext = os.path.splitext(filename)
    if not ext:
        ext = ".jpg"

    asset_id = str(uuid4())
    asset_path = None
    content = await file.read()
    try:
        asset = Asset(
            id=asset_id,
            original_filename=filename,
            mime_type=file.content_type or "application/octet-stream",
            width=0,
            height=0,
            original_path="",
        )
        db.add(asset)

        asset_path = os.path.join(settings.assets_originals_dir, f"{asset_id}{ext.lower()}")
        with open(asset_path, "wb") as output_file:
            output_file.write(content)

        from PIL import Image

        with Image.open(asset_path) as image:
            asset.width = image.width
            asset.height = image.height

        asset.original_path = asset_path
        db.commit()
        db.refresh(asset)
    except Exception as exc:
        db.rollback()
        if asset_path and os.path.exists(asset_path):
            os.remove(asset_path)
        raise HTTPException(status_code=400, detail=f"Upload failed: {exc}") from exc

    if generate_derivatives:
        _generate_derivatives_for_asset(db, asset, AssetDerivativeRequest())

    if tags:
        parsed_tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
        for tag in parsed_tags:
            db.add(AssetTag(asset_id=asset.id, tag=tag, source="manual"))
        db.commit()
        db.refresh(asset)

    return asset


@router.post("/assets/{asset_id}/auto-tag", response_model=AutoTagResponse)
def auto_tag_asset(
    asset_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    _get_asset_or_404(db, asset_id)
    set_autotag_job_status(db, asset_id, "queued")
    background_tasks.add_task(queue_auto_tagging_job, asset_id)
    return {"status": "queued"}


@router.get("/assets/auto-tag/status", response_model=list[AssetAutoTagJobOut])
def list_auto_tag_status(
    asset_ids: list[str] | None = Query(None),
    db: Session = Depends(get_db),
) -> Sequence[AssetAutoTagJob]:
    stmt = select(AssetAutoTagJob)
    if asset_ids:
        stmt = stmt.where(AssetAutoTagJob.asset_id.in_(asset_ids))
    return db.execute(stmt.order_by(AssetAutoTagJob.updated_at.desc())).scalars().all()


@router.get("/assets/taxonomy", response_model=list[TagTaxonomyOut])
def list_tag_taxonomy(
    status: str | None = None,
    db: Session = Depends(get_db),
) -> Sequence[TagTaxonomy]:
    stmt = select(TagTaxonomy)
    if status:
        stmt = stmt.where(TagTaxonomy.status == status)
    return db.execute(stmt.order_by(TagTaxonomy.tag.asc())).scalars().all()


@router.put("/assets/taxonomy/{tag}", response_model=TagTaxonomyOut)
def update_tag_taxonomy(
    tag: str,
    payload: TagTaxonomyUpdate,
    db: Session = Depends(get_db),
) -> TagTaxonomy:
    taxonomy = db.execute(select(TagTaxonomy).where(TagTaxonomy.tag == tag)).scalar_one_or_none()
    if not taxonomy:
        taxonomy = TagTaxonomy(tag=tag, status=payload.status)
        db.add(taxonomy)
    else:
        taxonomy.status = payload.status
    if payload.status == "approved":
        taxonomy.approved_at = func.now()
    db.commit()
    db.refresh(taxonomy)
    return taxonomy


@router.post("/assets/{asset_id}/tags", response_model=AssetOut)
def add_tags(
    asset_id: str,
    tags: list[AssetTagInput],
    db: Session = Depends(get_db),
) -> Asset:
    asset = _get_asset_or_404(db, asset_id)
    for tag in tags:
        existing = db.execute(
            select(AssetTag).where(
                AssetTag.asset_id == asset_id,
                AssetTag.tag == tag.tag,
                AssetTag.source == tag.source,
            )
        ).scalar_one_or_none()
        if existing:
            continue
        db.add(
            AssetTag(
                asset_id=asset_id,
                tag=tag.tag,
                source=tag.source,
                confidence=tag.confidence,
            )
        )
    db.commit()
    db.refresh(asset)
    return asset


@router.put("/assets/{asset_id}/roles", response_model=AssetOut)
def set_roles(
    asset_id: str,
    roles: list[AssetRoleInput],
    db: Session = Depends(get_db),
) -> Asset:
    asset = _get_asset_or_404(db, asset_id)
    requested = {role.role: role for role in roles}
    requested_keys = set(requested.keys())
    existing = {role.role: role for role in asset.roles}

    wants_hero_main = "hero_main" in requested_keys
    if wants_hero_main:
        other_heroes = db.execute(
            select(AssetRole).where(
                AssetRole.role == "hero_main", AssetRole.asset_id != asset_id
            )
        ).scalars().all()
        for hero_role in other_heroes:
            db.delete(hero_role)
            existing_showcase = db.execute(
                select(AssetRole).where(
                    AssetRole.asset_id == hero_role.asset_id,
                    AssetRole.role == "showcase",
                )
            ).scalar_one_or_none()
            if not existing_showcase:
                db.add(
                    AssetRole(
                        asset_id=hero_role.asset_id,
                        role="showcase",
                        is_published=False,
                    )
                )
    else:
        is_current_hero = "hero_main" in existing
        if is_current_hero:
            other_hero = db.execute(
                select(AssetRole).where(
                    AssetRole.role == "hero_main", AssetRole.asset_id != asset_id
                )
            ).scalar_one_or_none()
            if not other_hero:
                raise HTTPException(
                    status_code=400,
                    detail="Hero main must be set on another asset before removing.",
                )

    db.execute(delete(AssetRole).where(AssetRole.asset_id == asset_id))
    for role_key, role_input in requested.items():
        existing_role = existing.get(role_key)
        is_published = role_input.is_published
        if is_published is None and existing_role is not None:
            is_published = existing_role.is_published
        if is_published is None:
            is_published = False
        if role_key == "hero_main":
            is_published = True
        db.add(
            AssetRole(
                asset_id=asset_id,
                role=role_key,
                scope=role_input.scope,
                is_published=is_published,
            )
        )
    db.commit()
    db.refresh(asset)
    return asset


@router.put("/assets/{asset_id}/roles/{role}/publish", response_model=AssetOut)
def set_role_publish(
    asset_id: str,
    role: str,
    payload: AssetRolePublishInput,
    db: Session = Depends(get_db),
) -> Asset:
    asset = _get_asset_or_404(db, asset_id)
    target = db.execute(
        select(AssetRole).where(AssetRole.asset_id == asset_id, AssetRole.role == role)
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Role not found")
    if role == "hero_main" and not payload.is_published:
        raise HTTPException(status_code=400, detail="Hero main must remain published")
    target.is_published = payload.is_published
    db.commit()
    db.refresh(asset)
    return asset


@router.put("/assets/{asset_id}/rating", response_model=AssetOut)
def set_rating(
    asset_id: str,
    payload: AssetRatingInput,
    db: Session = Depends(get_db),
) -> Asset:
    asset = _get_asset_or_404(db, asset_id)
    asset.rating = payload.rating
    asset.starred = payload.starred
    db.commit()
    db.refresh(asset)
    return asset


@router.put("/assets/{asset_id}/focal-point", response_model=AssetOut)
def set_focal_point(
    asset_id: str,
    payload: AssetFocalPointInput,
    db: Session = Depends(get_db),
) -> Asset:
    asset = _get_asset_or_404(db, asset_id)
    asset.focal_x = payload.x
    asset.focal_y = payload.y
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/assets/{asset_id}/derivatives", response_model=AssetOut)
def generate_derivatives(
    asset_id: str,
    payload: AssetDerivativeRequest,
    db: Session = Depends(get_db),
) -> Asset:
    asset = _get_asset_or_404(db, asset_id)
    _generate_derivatives_for_asset(db, asset, payload)
    db.refresh(asset)
    return asset


def _generate_derivatives_for_asset(
    db: Session, asset: Asset, payload: AssetDerivativeRequest
) -> None:
    ratios = payload.ratios or settings.assets_derivative_ratios
    widths = payload.widths or settings.assets_derivative_widths

    db.execute(
        delete(AssetVariant).where(
            AssetVariant.asset_id == asset.id,
            AssetVariant.version == settings.assets_derivatives_version,
        )
    )
    db.commit()

    variants = generate_variants(
        source_path=asset.original_path,
        asset_id=asset.id,
        focal_x=asset.focal_x,
        focal_y=asset.focal_y,
        ratios=ratios,
        widths=widths,
    )

    for variant in variants:
        db.add(
            AssetVariant(
                asset_id=asset.id,
                ratio=variant["ratio"],
                width=variant["width"],
                height=variant["height"],
                format=variant["format"],
                path=variant["path"],
                version=settings.assets_derivatives_version,
            )
        )
    db.commit()


def _select_thumbnail_variant(asset: Asset) -> AssetVariant | None:
    if not asset.variants:
        return None

    def sort_key(variant: AssetVariant) -> tuple[int, int]:
        format_score = 0 if variant.format == "webp" else 1
        width_score = abs(variant.width - 800)
        return (format_score, width_score)

    return sorted(asset.variants, key=sort_key)[0]


def _safe_storage_path(path: str) -> str:
    safe_path = os.path.realpath(path)
    storage_root = os.path.realpath(settings.assets_storage_root)
    if not safe_path.startswith(storage_root):
        raise HTTPException(status_code=400, detail="Invalid asset path")
    return safe_path


def _safe_delete_file(path: str) -> None:
    safe_path = _safe_storage_path(path)
    if os.path.exists(safe_path):
        os.remove(safe_path)


def _safe_delete_tree(path: str) -> None:
    safe_path = _safe_storage_path(path)
    if os.path.isdir(safe_path):
        shutil.rmtree(safe_path, ignore_errors=True)
