from __future__ import annotations

from datetime import datetime, timezone
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import require_commit_approval
from app.db.session import get_db
from packages.domain.models.canonical import (
    BusinessProfileVersion,
    SiteStructureVersion,
    TaxonomySnapshot,
)
from packages.domain.models.site_intake import TopicTaxonomy, TopicTaxonomyChange
from packages.domain.schemas.site_intake import (
    BusinessProfileCreate,
    BusinessProfileOut,
    SiteStructureCreate,
    SiteStructureOut,
    SiteIntakeApproveRequest,
    SiteIntakeApprovalResponse,
    SiteIntakeProposalOut,
    SiteIntakeProposalRequest,
    SiteIntakeState,
    SiteStructureChangeRequest,
    SiteStructureChangeResponse,
    TopicTaxonomyCreate,
    TopicTaxonomyChangeOut,
    TopicTaxonomyOut,
    TopicTaxonomyRestoreRequest,
)
from app.services.memory import upsert_embedding
from app.services.site_intake import (
    apply_structure_change_request,
    build_site_intake_proposal,
    seed_tag_taxonomy_from_topics,
)

router = APIRouter()
logger = logging.getLogger(__name__)
MAX_INTAKE_VERSIONS = 3


def _resolve_latest_taxonomy(db: Session) -> TopicTaxonomy | None:
    latest_approved = _latest_record(db, TopicTaxonomy, status="approved")
    if latest_approved:
        return latest_approved
    return _latest_record(db, TopicTaxonomy)


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


def _resolve_business_profile_version_id(
    db: Session,
    requested_id: int | None,
) -> int | None:
    if requested_id is not None:
        return requested_id
    latest_approved = _latest_record(db, BusinessProfileVersion, status="approved")
    if latest_approved:
        return latest_approved.id
    latest = _latest_record(db, BusinessProfileVersion)
    return latest.id if latest else None


def _trim_versions(db: Session, model, limit: int = MAX_INTAKE_VERSIONS) -> None:
    stmt = select(model.id).order_by(model.created_at.desc()).limit(limit)
    keep_ids = [row[0] for row in db.execute(stmt).all()]
    if not keep_ids:
        return
    db.execute(delete(model).where(model.id.notin_(keep_ids)))
    db.commit()


def _latest_record(db: Session, model, status: str | None = None):
    stmt = select(model)
    if status:
        stmt = stmt.where(model.status == status)
    stmt = stmt.order_by(model.created_at.desc()).limit(1)
    return db.execute(stmt).scalar_one_or_none()


def _serialize_payload(payload: object) -> str:
    return json.dumps(payload, ensure_ascii=True, sort_keys=True)


def _log_taxonomy_change(
    db: Session,
    taxonomy: TopicTaxonomy,
    change_type: str,
    created_by: str,
    source_run_id: str | None,
) -> None:
    change = TopicTaxonomyChange(
        taxonomy_id=taxonomy.id,
        status=taxonomy.status,
        change_type=change_type,
        taxonomy_data=taxonomy.taxonomy_data,
        created_by=created_by,
        source_run_id=source_run_id,
    )
    db.add(change)


@router.post("/site/business-profile", response_model=BusinessProfileOut)
def create_business_profile(
    payload: BusinessProfileCreate,
    approval_id: int | None = None,
    db: Session = Depends(get_db),
) -> BusinessProfileVersion:
    status = payload.status or "draft"
    commit_classification = payload.commit_classification or "approval_required"
    require_commit_approval(
        commit_classification,
        approval_id,
        action="api.site.business_profile.create",
        db=db,
    )
    profile_data = payload.profile_data
    description = payload.description
    if description is None and isinstance(profile_data, dict):
        description = profile_data.get("notes") or None

    profile: BusinessProfileVersion | None = None
    if status == "draft" and not payload.force_new:
        profile = _latest_record(db, BusinessProfileVersion, status="draft")
    if status == "approved" and not payload.force_new:
        profile = _latest_record(db, BusinessProfileVersion, status="draft")

    if profile:
        profile.name = payload.name
        profile.description = description
        profile.profile_data = profile_data
        profile.status = status
        profile.commit_classification = commit_classification
        if payload.created_by:
            profile.created_by = payload.created_by
        if payload.source_run_id:
            profile.source_run_id = payload.source_run_id
        db.commit()
        db.refresh(profile)
    else:
        parent_version_id = payload.parent_version_id
        if parent_version_id is None:
            parent = _latest_record(db, BusinessProfileVersion)
            parent_version_id = parent.id if parent else None
        profile = BusinessProfileVersion(
            parent_version_id=parent_version_id,
            name=payload.name,
            description=description,
            profile_data=profile_data,
            status=status,
            created_by=payload.created_by or "user",
            source_run_id=payload.source_run_id,
            commit_classification=commit_classification,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    content = _serialize_payload(
        {
            "name": profile.name,
            "description": profile.description,
            "profile_data": profile.profile_data,
        }
    )
    try:
        upsert_embedding(
            db,
            source_type="business_profile",
            source_id=str(profile.id),
            content=content,
            record_metadata={"name": profile.name},
        )
    except Exception:
        logger.exception("Failed to embed business profile %s", profile.id)
    _trim_versions(db, BusinessProfileVersion)
    return profile


@router.get("/site/business-profile", response_model=BusinessProfileOut | None)
def get_latest_business_profile(db: Session = Depends(get_db)) -> BusinessProfileVersion | None:
    stmt = (
        select(BusinessProfileVersion)
        .order_by(BusinessProfileVersion.created_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


@router.post("/site/structure", response_model=SiteStructureOut)
def create_site_structure(
    payload: SiteStructureCreate,
    approval_id: int | None = None,
    db: Session = Depends(get_db),
) -> SiteStructureVersion:
    status = payload.status or "draft"
    commit_classification = payload.commit_classification or "approval_required"
    require_commit_approval(
        commit_classification,
        approval_id,
        action="api.site.structure.create",
        db=db,
    )
    structure: SiteStructureVersion | None = None
    if status == "draft" and not payload.force_new:
        structure = _latest_record(db, SiteStructureVersion, status="draft")
    if status == "approved" and not payload.force_new:
        structure = _latest_record(db, SiteStructureVersion, status="draft")

    created_by = payload.created_by or "user"
    source_run_id = payload.source_run_id
    snapshot_id_to_set = payload.taxonomy_snapshot_id
    if status == "approved" and snapshot_id_to_set is None:
        snapshot = _capture_taxonomy_snapshot(db, created_by=created_by, source_run_id=source_run_id)
        snapshot_id_to_set = snapshot.id if snapshot else None

    if structure:
        structure.status = status
        structure.structure_data = payload.structure_data
        if payload.selection_rules is not None:
            structure.selection_rules = payload.selection_rules
        if status == "approved":
            structure.taxonomy_snapshot_id = snapshot_id_to_set
        elif payload.taxonomy_snapshot_id is not None:
            structure.taxonomy_snapshot_id = payload.taxonomy_snapshot_id
        structure.commit_classification = commit_classification
        if payload.business_profile_version_id is not None:
            structure.business_profile_version_id = payload.business_profile_version_id
        elif structure.business_profile_version_id is None:
            structure.business_profile_version_id = _resolve_business_profile_version_id(
                db, None
            )
        if payload.created_by:
            structure.created_by = payload.created_by
        if payload.source_run_id:
            structure.source_run_id = payload.source_run_id
        db.commit()
        db.refresh(structure)
    else:
        parent_version_id = payload.parent_version_id
        if parent_version_id is None:
            parent = _latest_record(db, SiteStructureVersion)
            parent_version_id = parent.id if parent else None
        structure = SiteStructureVersion(
            parent_version_id=parent_version_id,
            status=status,
            structure_data=payload.structure_data,
            selection_rules=payload.selection_rules,
            taxonomy_snapshot_id=snapshot_id_to_set,
            business_profile_version_id=_resolve_business_profile_version_id(
                db, payload.business_profile_version_id
            ),
            created_by=created_by,
            source_run_id=source_run_id,
            commit_classification=commit_classification,
        )
        db.add(structure)
        db.commit()
        db.refresh(structure)
    content = _serialize_payload(structure.structure_data)
    try:
        upsert_embedding(
            db,
            source_type="site_structure",
            source_id=str(structure.id),
            content=content,
            record_metadata={"status": structure.status},
        )
    except Exception:
        logger.exception("Failed to embed site structure %s", structure.id)
    _trim_versions(db, SiteStructureVersion)
    return structure


@router.get("/site/structure", response_model=SiteStructureOut | None)
def get_latest_site_structure(db: Session = Depends(get_db)) -> SiteStructureVersion | None:
    stmt = (
        select(SiteStructureVersion)
        .order_by(SiteStructureVersion.created_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


@router.post("/site/taxonomy", response_model=TopicTaxonomyOut)
def create_topic_taxonomy(
    payload: TopicTaxonomyCreate,
    db: Session = Depends(get_db),
) -> TopicTaxonomy:
    status = payload.status or "draft"
    approved_at = datetime.now(timezone.utc) if status == "approved" else None
    taxonomy: TopicTaxonomy | None = None
    if status == "draft" and not payload.force_new:
        taxonomy = _latest_record(db, TopicTaxonomy, status="draft")
    if status == "approved" and not payload.force_new:
        taxonomy = _latest_record(db, TopicTaxonomy, status="draft")

    created_by = payload.created_by or "user"
    source_run_id = payload.source_run_id
    is_new = taxonomy is None
    if taxonomy:
        taxonomy.status = status
        taxonomy.taxonomy_data = payload.taxonomy_data
        taxonomy.approved_at = approved_at
    else:
        taxonomy = TopicTaxonomy(
            status=status,
            taxonomy_data=payload.taxonomy_data,
            approved_at=approved_at,
        )
        db.add(taxonomy)
    db.flush()
    change_type = "approved" if status == "approved" else ("created" if is_new else "updated")
    _log_taxonomy_change(
        db,
        taxonomy=taxonomy,
        change_type=change_type,
        created_by=created_by,
        source_run_id=source_run_id,
    )
    db.commit()
    db.refresh(taxonomy)
    content = _serialize_payload(taxonomy.taxonomy_data)
    try:
        upsert_embedding(
            db,
            source_type="topic_taxonomy",
            source_id=str(taxonomy.id),
            content=content,
            record_metadata={"status": taxonomy.status},
        )
    except Exception:
        logger.exception("Failed to embed topic taxonomy %s", taxonomy.id)
    if taxonomy.status == "approved":
        try:
            seed_tag_taxonomy_from_topics(db, taxonomy.taxonomy_data or {})
        except Exception:
            logger.exception("Failed to seed tag taxonomy from topic taxonomy %s", taxonomy.id)
    _trim_versions(db, TopicTaxonomy)
    return taxonomy


@router.get("/site/taxonomy", response_model=TopicTaxonomyOut | None)
def get_latest_topic_taxonomy(db: Session = Depends(get_db)) -> TopicTaxonomy | None:
    stmt = select(TopicTaxonomy).order_by(TopicTaxonomy.created_at.desc()).limit(1)
    return db.execute(stmt).scalar_one_or_none()


@router.get("/site/taxonomy/history", response_model=list[TopicTaxonomyChangeOut])
def list_taxonomy_history(
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[TopicTaxonomyChange]:
    stmt = (
        select(TopicTaxonomyChange)
        .order_by(TopicTaxonomyChange.created_at.desc())
        .limit(limit)
    )
    return db.execute(stmt).scalars().all()


@router.post("/site/taxonomy/restore", response_model=TopicTaxonomyOut)
def restore_taxonomy(
    payload: TopicTaxonomyRestoreRequest,
    db: Session = Depends(get_db),
) -> TopicTaxonomy:
    change = db.get(TopicTaxonomyChange, payload.change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Taxonomy change not found")
    if change.taxonomy_data is None:
        raise HTTPException(status_code=400, detail="Taxonomy change has no data to restore")

    status = payload.status or "draft"
    approved_at = datetime.now(timezone.utc) if status == "approved" else None
    taxonomy: TopicTaxonomy | None = None
    if status == "draft" and not payload.force_new:
        taxonomy = _latest_record(db, TopicTaxonomy, status="draft")
    if status == "approved" and not payload.force_new:
        taxonomy = _latest_record(db, TopicTaxonomy, status="draft")

    is_new = taxonomy is None
    if taxonomy:
        taxonomy.status = status
        taxonomy.taxonomy_data = change.taxonomy_data
        taxonomy.approved_at = approved_at
    else:
        taxonomy = TopicTaxonomy(
            status=status,
            taxonomy_data=change.taxonomy_data,
            approved_at=approved_at,
        )
        db.add(taxonomy)

    db.flush()
    _log_taxonomy_change(
        db,
        taxonomy=taxonomy,
        change_type="restored" if not is_new else "created",
        created_by=payload.created_by or "user",
        source_run_id=payload.source_run_id,
    )
    db.commit()
    db.refresh(taxonomy)

    content = _serialize_payload(taxonomy.taxonomy_data)
    try:
        upsert_embedding(
            db,
            source_type="topic_taxonomy",
            source_id=str(taxonomy.id),
            content=content,
            record_metadata={"status": taxonomy.status},
        )
    except Exception:
        logger.exception("Failed to embed topic taxonomy %s", taxonomy.id)
    if taxonomy.status == "approved":
        try:
            seed_tag_taxonomy_from_topics(db, taxonomy.taxonomy_data or {})
        except Exception:
            logger.exception("Failed to seed tag taxonomy from topic taxonomy %s", taxonomy.id)
    _trim_versions(db, TopicTaxonomy)
    return taxonomy


@router.post("/site/intake/proposal", response_model=SiteIntakeProposalOut)
def propose_site_intake(payload: SiteIntakeProposalRequest) -> dict:
    structure = payload.site_structure.model_dump() if payload.site_structure else None
    return build_site_intake_proposal(
        business_profile=payload.business_profile.model_dump(),
        site_structure=structure,
        changes_requested=payload.changes_requested,
    )


@router.post("/site/intake/approve", response_model=SiteIntakeApprovalResponse)
def approve_site_intake(
    payload: SiteIntakeApproveRequest,
    db: Session = Depends(get_db),
) -> dict:
    profile_data = payload.business_profile.model_dump()
    business_profile = BusinessProfileVersion(
        parent_version_id=_resolve_business_profile_version_id(db, None),
        name=None,
        description=profile_data.get("notes"),
        profile_data=profile_data,
        status="approved",
        created_by="user",
        commit_classification="approval_required",
    )
    db.add(business_profile)
    db.flush()
    content = _serialize_payload(
        {
            "name": business_profile.name,
            "description": business_profile.description,
            "profile_data": business_profile.profile_data,
        }
    )
    try:
        upsert_embedding(
            db,
            source_type="business_profile",
            source_id=str(business_profile.id),
            content=content,
            record_metadata={"name": business_profile.name},
        )
    except Exception:
        logger.exception("Failed to embed business profile %s", business_profile.id)

    snapshot = TaxonomySnapshot(
        snapshot_data=payload.topic_taxonomy.model_dump(),
        record_metadata={"source": "site_intake_approve"},
        created_by="user",
        source_run_id=None,
    )
    db.add(snapshot)
    db.flush()

    structure = SiteStructureVersion(
        parent_version_id=_latest_record(db, SiteStructureVersion).id
        if _latest_record(db, SiteStructureVersion)
        else None,
        business_profile_version_id=business_profile.id,
        status="approved",
        structure_data=payload.site_structure.model_dump(),
        taxonomy_snapshot_id=snapshot.id,
        created_by="user",
        commit_classification="approval_required",
    )
    db.add(structure)
    db.flush()
    content = _serialize_payload(structure.structure_data)
    try:
        upsert_embedding(
            db,
            source_type="site_structure",
            source_id=str(structure.id),
            content=content,
            record_metadata={"status": structure.status},
        )
    except Exception:
        logger.exception("Failed to embed site structure %s", structure.id)

    taxonomy = TopicTaxonomy(
        status="approved",
        taxonomy_data=payload.topic_taxonomy.model_dump(),
        approved_at=datetime.now(timezone.utc),
    )
    db.add(taxonomy)
    db.flush()
    _log_taxonomy_change(
        db,
        taxonomy=taxonomy,
        change_type="approved",
        created_by="user",
        source_run_id=None,
    )
    content = _serialize_payload(taxonomy.taxonomy_data)
    try:
        upsert_embedding(
            db,
            source_type="topic_taxonomy",
            source_id=str(taxonomy.id),
            content=content,
            record_metadata={"status": taxonomy.status},
        )
    except Exception:
        logger.exception("Failed to embed topic taxonomy %s", taxonomy.id)

    try:
        seed_tag_taxonomy_from_topics(db, taxonomy.taxonomy_data or {})
    except Exception:
        logger.exception("Failed to seed tag taxonomy from topic taxonomy %s", taxonomy.id)

    db.commit()
    db.refresh(business_profile)
    db.refresh(structure)
    db.refresh(taxonomy)
    _trim_versions(db, BusinessProfileVersion)
    _trim_versions(db, SiteStructureVersion)
    _trim_versions(db, TopicTaxonomy)
    return {
        "business_profile": business_profile,
        "site_structure": structure,
        "topic_taxonomy": taxonomy,
    }


@router.get("/site/intake/latest", response_model=SiteIntakeApprovalResponse | None)
def get_latest_site_intake(db: Session = Depends(get_db)) -> dict | None:
    profile_stmt = (
        select(BusinessProfileVersion)
        .order_by(BusinessProfileVersion.created_at.desc())
        .limit(1)
    )
    structure_stmt = (
        select(SiteStructureVersion)
        .order_by(SiteStructureVersion.created_at.desc())
        .limit(1)
    )
    taxonomy_stmt = select(TopicTaxonomy).order_by(TopicTaxonomy.created_at.desc()).limit(1)
    profile = db.execute(profile_stmt).scalar_one_or_none()
    structure = db.execute(structure_stmt).scalar_one_or_none()
    taxonomy = db.execute(taxonomy_stmt).scalar_one_or_none()
    if not profile or not structure or not taxonomy:
        return None
    return {
        "business_profile": profile,
        "site_structure": structure,
        "topic_taxonomy": taxonomy,
    }


@router.get("/site/intake/state", response_model=SiteIntakeState)
def get_site_intake_state(
    limit: int = MAX_INTAKE_VERSIONS,
    db: Session = Depends(get_db),
) -> dict:
    profile_stmt = (
        select(BusinessProfileVersion)
        .order_by(BusinessProfileVersion.created_at.desc())
        .limit(1)
    )
    structure_stmt = (
        select(SiteStructureVersion)
        .order_by(SiteStructureVersion.created_at.desc())
        .limit(1)
    )
    taxonomy_stmt = select(TopicTaxonomy).order_by(TopicTaxonomy.created_at.desc()).limit(1)
    profile = db.execute(profile_stmt).scalar_one_or_none()
    structure = db.execute(structure_stmt).scalar_one_or_none()
    taxonomy = db.execute(taxonomy_stmt).scalar_one_or_none()

    history_profiles = (
        db.execute(
            select(BusinessProfileVersion)
            .order_by(BusinessProfileVersion.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    history_structures = (
        db.execute(
            select(SiteStructureVersion)
            .order_by(SiteStructureVersion.created_at.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    history_taxonomies = (
        db.execute(
            select(TopicTaxonomy).order_by(TopicTaxonomy.created_at.desc()).limit(limit)
        )
        .scalars()
        .all()
    )

    return {
        "business_profile": profile,
        "site_structure": structure,
        "topic_taxonomy": taxonomy,
        "business_profile_history": history_profiles,
        "site_structure_history": history_structures,
        "topic_taxonomy_history": history_taxonomies,
    }


@router.post("/site/structure/change-request", response_model=SiteStructureChangeResponse)
def change_site_structure(
    payload: SiteStructureChangeRequest,
    db: Session = Depends(get_db),
) -> dict:
    structure_data = None
    if payload.structure is not None:
        structure_data = payload.structure.model_dump()
    else:
        stmt = (
            select(SiteStructureVersion)
            .order_by(SiteStructureVersion.created_at.desc())
            .limit(1)
        )
        latest = db.execute(stmt).scalar_one_or_none()
        if latest is None or latest.structure_data is None:
            raise HTTPException(status_code=404, detail="No site structure found")
        structure_data = latest.structure_data

    updated, summary = apply_structure_change_request(structure_data, payload.change_request)
    return {"structure": updated, "summary": summary}
