from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.domain.models.canonical import (
    PageConfigVersion,
    SiteStructureVersion,
    TaxonomySnapshot,
)
from packages.domain.models.site_intake import TopicTaxonomy
from packages.domain.schemas.canonical import PageConfigVersionCreate


def _latest_page_config(
    db: Session,
    status: str | None = None,
    page_id: str | None = None,
    site_structure_version_id: int | None = None,
) -> PageConfigVersion | None:
    stmt = select(PageConfigVersion)
    if status:
        stmt = stmt.where(PageConfigVersion.status == status)
    if page_id:
        stmt = stmt.where(PageConfigVersion.page_id == page_id)
    if site_structure_version_id:
        stmt = stmt.where(PageConfigVersion.site_structure_version_id == site_structure_version_id)
    stmt = stmt.order_by(PageConfigVersion.created_at.desc()).limit(1)
    return db.execute(stmt).scalar_one_or_none()


def _resolve_latest_taxonomy(db: Session) -> TopicTaxonomy | None:
    stmt = (
        select(TopicTaxonomy)
        .where(TopicTaxonomy.status == "approved")
        .order_by(TopicTaxonomy.created_at.desc())
        .limit(1)
    )
    latest_approved = db.execute(stmt).scalar_one_or_none()
    if latest_approved:
        return latest_approved
    stmt = select(TopicTaxonomy).order_by(TopicTaxonomy.created_at.desc()).limit(1)
    return db.execute(stmt).scalar_one_or_none()


def _capture_taxonomy_snapshot(
    db: Session,
    created_by: str,
    source_run_id: str | None,
) -> TaxonomySnapshot | None:
    latest_taxonomy = _resolve_latest_taxonomy(db)
    if not latest_taxonomy or latest_taxonomy.taxonomy_data is None:
        return None
    snapshot = TaxonomySnapshot(
        snapshot_data=latest_taxonomy.taxonomy_data,
        record_metadata={
            "topic_taxonomy_id": latest_taxonomy.id,
            "topic_taxonomy_status": latest_taxonomy.status,
        },
        created_by=created_by,
        source_run_id=source_run_id,
    )
    db.add(snapshot)
    db.flush()
    return snapshot


def _resolve_site_structure_version_id(
    db: Session,
    requested_id: int | None,
) -> int | None:
    if requested_id is not None:
        return requested_id
    stmt = (
        select(SiteStructureVersion)
        .where(SiteStructureVersion.status == "approved")
        .order_by(SiteStructureVersion.created_at.desc())
        .limit(1)
    )
    latest_approved = db.execute(stmt).scalar_one_or_none()
    if latest_approved:
        return latest_approved.id
    stmt = select(SiteStructureVersion).order_by(SiteStructureVersion.created_at.desc()).limit(1)
    latest = db.execute(stmt).scalar_one_or_none()
    return latest.id if latest else None


def create_page_config_version(
    db: Session,
    payload: PageConfigVersionCreate,
) -> PageConfigVersion:
    status = payload.status or "draft"
    created_by = payload.created_by or "user"
    source_run_id = payload.source_run_id
    parent_version_id = payload.parent_version_id
    if parent_version_id is None:
        parent = _latest_page_config(db, page_id=payload.page_id)
        parent_version_id = parent.id if parent else None

    taxonomy_snapshot_id = payload.taxonomy_snapshot_id
    if payload.selection_rules is not None and taxonomy_snapshot_id is None:
        snapshot = _capture_taxonomy_snapshot(
            db, created_by=created_by, source_run_id=source_run_id
        )
        taxonomy_snapshot_id = snapshot.id if snapshot else None

    page_config = PageConfigVersion(
        parent_version_id=parent_version_id,
        site_structure_version_id=_resolve_site_structure_version_id(
            db, payload.site_structure_version_id
        ),
        page_id=payload.page_id,
        config_data=payload.config_data,
        selection_rules=payload.selection_rules,
        taxonomy_snapshot_id=taxonomy_snapshot_id,
        created_by=created_by,
        source_run_id=source_run_id,
        commit_classification=payload.commit_classification or "approval_required",
        status=status,
    )
    db.add(page_config)
    db.commit()
    db.refresh(page_config)
    return page_config


def list_page_config_history(
    db: Session,
    page_id: str | None = None,
    site_structure_version_id: int | None = None,
    limit: int = 20,
) -> list[PageConfigVersion]:
    stmt = select(PageConfigVersion)
    if page_id:
        stmt = stmt.where(PageConfigVersion.page_id == page_id)
    if site_structure_version_id:
        stmt = stmt.where(PageConfigVersion.site_structure_version_id == site_structure_version_id)
    stmt = stmt.order_by(PageConfigVersion.created_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


def get_latest_page_config(
    db: Session,
    status: str | None = None,
    page_id: str | None = None,
    site_structure_version_id: int | None = None,
) -> PageConfigVersion | None:
    return _latest_page_config(
        db,
        status=status,
        page_id=page_id,
        site_structure_version_id=site_structure_version_id,
    )
