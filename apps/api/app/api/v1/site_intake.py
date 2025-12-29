from __future__ import annotations

from datetime import datetime, timezone
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.site_intake import BusinessProfile, SiteStructure, TopicTaxonomy
from app.schemas.site_intake import (
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
    TopicTaxonomyOut,
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


@router.post("/site/business-profile", response_model=BusinessProfileOut)
def create_business_profile(
    payload: BusinessProfileCreate,
    db: Session = Depends(get_db),
) -> BusinessProfile:
    status = payload.status or "draft"
    profile_data = payload.profile_data
    description = payload.description
    if description is None and isinstance(profile_data, dict):
        description = profile_data.get("notes") or None

    profile: BusinessProfile | None = None
    if status == "draft" and not payload.force_new:
        profile = _latest_record(db, BusinessProfile, status="draft")
    if status == "approved" and not payload.force_new:
        profile = _latest_record(db, BusinessProfile, status="draft")

    if profile:
        profile.name = payload.name
        profile.description = description
        profile.profile_data = profile_data
        if status == "approved":
            profile.status = "approved"
            profile.approved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(profile)
    else:
        approved_at = datetime.now(timezone.utc) if status == "approved" else None
        profile = BusinessProfile(
            name=payload.name,
            description=description,
            profile_data=profile_data,
            status=status,
            approved_at=approved_at,
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
    _trim_versions(db, BusinessProfile)
    return profile


@router.get("/site/business-profile", response_model=BusinessProfileOut | None)
def get_latest_business_profile(db: Session = Depends(get_db)) -> BusinessProfile | None:
    stmt = select(BusinessProfile).order_by(BusinessProfile.created_at.desc()).limit(1)
    return db.execute(stmt).scalar_one_or_none()


@router.post("/site/structure", response_model=SiteStructureOut)
def create_site_structure(
    payload: SiteStructureCreate,
    db: Session = Depends(get_db),
) -> SiteStructure:
    status = payload.status or "draft"
    approved_at = datetime.now(timezone.utc) if status == "approved" else None
    structure: SiteStructure | None = None
    if status == "draft" and not payload.force_new:
        structure = _latest_record(db, SiteStructure, status="draft")
    if status == "approved" and not payload.force_new:
        structure = _latest_record(db, SiteStructure, status="draft")

    if structure:
        structure.status = status
        structure.structure_data = payload.structure_data
        structure.approved_at = approved_at
        db.commit()
        db.refresh(structure)
    else:
        structure = SiteStructure(
            status=status,
            structure_data=payload.structure_data,
            approved_at=approved_at,
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
    _trim_versions(db, SiteStructure)
    return structure


@router.get("/site/structure", response_model=SiteStructureOut | None)
def get_latest_site_structure(db: Session = Depends(get_db)) -> SiteStructure | None:
    stmt = select(SiteStructure).order_by(SiteStructure.created_at.desc()).limit(1)
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

    if taxonomy:
        taxonomy.status = status
        taxonomy.taxonomy_data = payload.taxonomy_data
        taxonomy.approved_at = approved_at
        db.commit()
        db.refresh(taxonomy)
    else:
        taxonomy = TopicTaxonomy(
            status=status,
            taxonomy_data=payload.taxonomy_data,
            approved_at=approved_at,
        )
        db.add(taxonomy)
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
    business_profile = BusinessProfile(
        name=None,
        description=profile_data.get("notes"),
        profile_data=profile_data,
        status="approved",
        approved_at=datetime.now(timezone.utc),
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

    structure = SiteStructure(
        status="approved",
        structure_data=payload.site_structure.model_dump(),
        approved_at=datetime.now(timezone.utc),
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
    _trim_versions(db, BusinessProfile)
    _trim_versions(db, SiteStructure)
    _trim_versions(db, TopicTaxonomy)
    return {
        "business_profile": business_profile,
        "site_structure": structure,
        "topic_taxonomy": taxonomy,
    }


@router.get("/site/intake/latest", response_model=SiteIntakeApprovalResponse | None)
def get_latest_site_intake(db: Session = Depends(get_db)) -> dict | None:
    profile_stmt = select(BusinessProfile).order_by(BusinessProfile.created_at.desc()).limit(1)
    structure_stmt = select(SiteStructure).order_by(SiteStructure.created_at.desc()).limit(1)
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
    profile_stmt = select(BusinessProfile).order_by(BusinessProfile.created_at.desc()).limit(1)
    structure_stmt = select(SiteStructure).order_by(SiteStructure.created_at.desc()).limit(1)
    taxonomy_stmt = select(TopicTaxonomy).order_by(TopicTaxonomy.created_at.desc()).limit(1)
    profile = db.execute(profile_stmt).scalar_one_or_none()
    structure = db.execute(structure_stmt).scalar_one_or_none()
    taxonomy = db.execute(taxonomy_stmt).scalar_one_or_none()

    history_profiles = (
        db.execute(
            select(BusinessProfile).order_by(BusinessProfile.created_at.desc()).limit(limit)
        )
        .scalars()
        .all()
    )
    history_structures = (
        db.execute(
            select(SiteStructure).order_by(SiteStructure.created_at.desc()).limit(limit)
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
        stmt = select(SiteStructure).order_by(SiteStructure.created_at.desc()).limit(1)
        latest = db.execute(stmt).scalar_one_or_none()
        if latest is None or latest.structure_data is None:
            raise HTTPException(status_code=404, detail="No site structure found")
        structure_data = latest.structure_data

    updated, summary = apply_structure_change_request(structure_data, payload.change_request)
    return {"structure": updated, "summary": summary}
