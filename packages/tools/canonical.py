from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from pydantic import BaseModel
from sqlalchemy import delete, select

from app.services.memory import upsert_embedding
from packages.domain.models.canonical import (
    BusinessProfileVersion,
    SiteStructureVersion,
    TaxonomySnapshot,
)
from packages.domain.models.site_intake import TopicTaxonomy, TopicTaxonomyChange
from packages.domain.schemas.canonical import (
    BusinessProfileVersionCreate,
    BusinessProfileVersionOut,
    PageConfigVersionCreate,
    PageConfigVersionOut,
    SiteStructureVersionCreate,
    SiteStructureVersionOut,
)
from packages.domain.schemas.site_intake import (
    TopicTaxonomyCreate,
    TopicTaxonomyOut,
    TopicTaxonomyRestoreRequest,
)
from packages.domain.services.page_config import (
    create_page_config_version,
    get_latest_page_config,
    list_page_config_history,
)
from app.services.site_intake import seed_tag_taxonomy_from_topics
from packages.tools.registry import ToolContext, ToolRegistry, ToolSpec

logger = logging.getLogger(__name__)
MAX_TAXONOMY_VERSIONS = 3


def _page_config_create_handler(
    payload: PageConfigVersionCreate,
    context: ToolContext,
) -> PageConfigVersionOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    page_config = create_page_config_version(context.db, payload)
    return PageConfigVersionOut.model_validate(page_config)


class PageConfigLatestInput(BaseModel):
    page_id: str | None = None
    status: str | None = None
    site_structure_version_id: int | None = None


class PageConfigLatestOutput(BaseModel):
    page_config: PageConfigVersionOut | None


def _page_config_latest_handler(
    payload: PageConfigLatestInput,
    context: ToolContext,
) -> PageConfigLatestOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    page_config = get_latest_page_config(
        context.db,
        status=payload.status,
        page_id=payload.page_id,
        site_structure_version_id=payload.site_structure_version_id,
    )
    if page_config is None:
        return PageConfigLatestOutput(page_config=None)
    return PageConfigLatestOutput(page_config=PageConfigVersionOut.model_validate(page_config))


class PageConfigHistoryInput(BaseModel):
    page_id: str | None = None
    site_structure_version_id: int | None = None
    limit: int = 20


class PageConfigHistoryOutput(BaseModel):
    items: list[PageConfigVersionOut]


def _page_config_history_handler(
    payload: PageConfigHistoryInput,
    context: ToolContext,
) -> PageConfigHistoryOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    items = list_page_config_history(
        context.db,
        page_id=payload.page_id,
        site_structure_version_id=payload.site_structure_version_id,
        limit=payload.limit,
    )
    return PageConfigHistoryOutput(
        items=[PageConfigVersionOut.model_validate(item) for item in items]
    )


def _latest_record(db, model, status: str | None = None, **filters):
    stmt = select(model)
    if status:
        stmt = stmt.where(model.status == status)
    for field, value in filters.items():
        if value is None:
            continue
        stmt = stmt.where(getattr(model, field) == value)
    stmt = stmt.order_by(model.created_at.desc()).limit(1)
    return db.execute(stmt).scalar_one_or_none()


def _list_records(db, model, status: str | None = None, limit: int = 20, **filters):
    stmt = select(model)
    if status:
        stmt = stmt.where(model.status == status)
    for field, value in filters.items():
        if value is None:
            continue
        stmt = stmt.where(getattr(model, field) == value)
    stmt = stmt.order_by(model.created_at.desc()).limit(limit)
    return db.execute(stmt).scalars().all()


def _serialize_payload(payload: object) -> str:
    return json.dumps(payload, ensure_ascii=True, sort_keys=True)


def _trim_versions(db, model, limit: int = MAX_TAXONOMY_VERSIONS) -> None:
    stmt = select(model.id).order_by(model.created_at.desc()).limit(limit)
    keep_ids = [row[0] for row in db.execute(stmt).all()]
    if not keep_ids:
        return
    db.execute(delete(model).where(model.id.notin_(keep_ids)))
    db.commit()


def _log_taxonomy_change(
    db,
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


def _create_topic_taxonomy(
    db,
    payload: TopicTaxonomyCreate,
    status_override: str | None = None,
) -> TopicTaxonomy:
    status = status_override or payload.status or "draft"
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


def _restore_topic_taxonomy(
    db,
    payload: TopicTaxonomyRestoreRequest,
) -> TopicTaxonomy:
    change = db.get(TopicTaxonomyChange, payload.change_id)
    if not change:
        raise RuntimeError("Taxonomy change not found")
    if change.taxonomy_data is None:
        raise RuntimeError("Taxonomy change has no data to restore")

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


def _resolve_latest_taxonomy(db) -> TopicTaxonomy | None:
    latest_approved = _latest_record(db, TopicTaxonomy, status="approved")
    if latest_approved:
        return latest_approved
    return _latest_record(db, TopicTaxonomy)


def _capture_taxonomy_snapshot(
    db,
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


def _resolve_business_profile_version_id(db, requested_id: int | None) -> int | None:
    if requested_id is not None:
        return requested_id
    latest_approved = _latest_record(db, BusinessProfileVersion, status="approved")
    if latest_approved:
        return latest_approved.id
    latest = _latest_record(db, BusinessProfileVersion)
    return latest.id if latest else None


def _create_business_profile_version(
    db,
    payload: BusinessProfileVersionCreate,
    status_override: str | None = None,
) -> BusinessProfileVersion:
    status = status_override or payload.status or "draft"
    profile_data = payload.profile_data
    description = payload.description
    if description is None and isinstance(profile_data, dict):
        description = profile_data.get("notes") or None
    parent_version_id = payload.parent_version_id
    if parent_version_id is None:
        parent = _latest_record(db, BusinessProfileVersion)
        parent_version_id = parent.id if parent else None

    profile = BusinessProfileVersion(
        parent_version_id=parent_version_id,
        name=payload.name,
        description=description,
        profile_data=profile_data,
        created_by=payload.created_by or "user",
        source_run_id=payload.source_run_id,
        commit_classification=payload.commit_classification or "approval_required",
        status=status,
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

    return profile


def _create_site_structure_version(
    db,
    payload: SiteStructureVersionCreate,
    status_override: str | None = None,
) -> SiteStructureVersion:
    status = status_override or payload.status or "draft"
    created_by = payload.created_by or "user"
    source_run_id = payload.source_run_id
    snapshot_id_to_set = payload.taxonomy_snapshot_id
    if payload.selection_rules is not None and snapshot_id_to_set is None:
        snapshot = _capture_taxonomy_snapshot(
            db, created_by=created_by, source_run_id=source_run_id
        )
        snapshot_id_to_set = snapshot.id if snapshot else None
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
        commit_classification=payload.commit_classification or "approval_required",
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

    return structure


class BusinessProfileLatestInput(BaseModel):
    status: str | None = None


class BusinessProfileLatestOutput(BaseModel):
    business_profile: BusinessProfileVersionOut | None


def _business_profile_latest_handler(
    payload: BusinessProfileLatestInput,
    context: ToolContext,
) -> BusinessProfileLatestOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    profile = _latest_record(context.db, BusinessProfileVersion, status=payload.status)
    if profile is None:
        return BusinessProfileLatestOutput(business_profile=None)
    return BusinessProfileLatestOutput(
        business_profile=BusinessProfileVersionOut.model_validate(profile)
    )


def _business_profile_create_handler(
    payload: BusinessProfileVersionCreate,
    context: ToolContext,
) -> BusinessProfileVersionOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    profile = _create_business_profile_version(context.db, payload)
    return BusinessProfileVersionOut.model_validate(profile)


def _business_profile_approve_handler(
    payload: BusinessProfileVersionCreate,
    context: ToolContext,
) -> BusinessProfileVersionOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    profile = _create_business_profile_version(
        context.db,
        payload,
        status_override="approved",
    )
    return BusinessProfileVersionOut.model_validate(profile)


class BusinessProfileHistoryInput(BaseModel):
    status: str | None = None
    limit: int = 20


class BusinessProfileHistoryOutput(BaseModel):
    items: list[BusinessProfileVersionOut]


def _business_profile_history_handler(
    payload: BusinessProfileHistoryInput,
    context: ToolContext,
) -> BusinessProfileHistoryOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    items = _list_records(
        context.db,
        BusinessProfileVersion,
        status=payload.status,
        limit=payload.limit,
    )
    return BusinessProfileHistoryOutput(
        items=[BusinessProfileVersionOut.model_validate(item) for item in items]
    )


class SiteStructureLatestInput(BaseModel):
    status: str | None = None
    business_profile_version_id: int | None = None


class SiteStructureLatestOutput(BaseModel):
    site_structure: SiteStructureVersionOut | None


def _site_structure_latest_handler(
    payload: SiteStructureLatestInput,
    context: ToolContext,
) -> SiteStructureLatestOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    structure = _latest_record(
        context.db,
        SiteStructureVersion,
        status=payload.status,
        business_profile_version_id=payload.business_profile_version_id,
    )
    if structure is None:
        return SiteStructureLatestOutput(site_structure=None)
    return SiteStructureLatestOutput(
        site_structure=SiteStructureVersionOut.model_validate(structure)
    )


def _site_structure_create_handler(
    payload: SiteStructureVersionCreate,
    context: ToolContext,
) -> SiteStructureVersionOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    structure = _create_site_structure_version(context.db, payload)
    return SiteStructureVersionOut.model_validate(structure)


def _site_structure_approve_handler(
    payload: SiteStructureVersionCreate,
    context: ToolContext,
) -> SiteStructureVersionOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    structure = _create_site_structure_version(
        context.db,
        payload,
        status_override="approved",
    )
    return SiteStructureVersionOut.model_validate(structure)


class SiteStructureHistoryInput(BaseModel):
    status: str | None = None
    business_profile_version_id: int | None = None
    limit: int = 20


class SiteStructureHistoryOutput(BaseModel):
    items: list[SiteStructureVersionOut]


def _site_structure_history_handler(
    payload: SiteStructureHistoryInput,
    context: ToolContext,
) -> SiteStructureHistoryOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    items = _list_records(
        context.db,
        SiteStructureVersion,
        status=payload.status,
        business_profile_version_id=payload.business_profile_version_id,
        limit=payload.limit,
    )
    return SiteStructureHistoryOutput(
        items=[SiteStructureVersionOut.model_validate(item) for item in items]
    )


class TopicTaxonomyLatestInput(BaseModel):
    status: str | None = None


class TopicTaxonomyLatestOutput(BaseModel):
    topic_taxonomy: TopicTaxonomyOut | None


def _topic_taxonomy_latest_handler(
    payload: TopicTaxonomyLatestInput,
    context: ToolContext,
) -> TopicTaxonomyLatestOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    taxonomy = _latest_record(context.db, TopicTaxonomy, status=payload.status)
    if taxonomy is None:
        return TopicTaxonomyLatestOutput(topic_taxonomy=None)
    return TopicTaxonomyLatestOutput(
        topic_taxonomy=TopicTaxonomyOut.model_validate(taxonomy)
    )


class TopicTaxonomyHistoryInput(BaseModel):
    status: str | None = None
    limit: int = 20


class TopicTaxonomyHistoryOutput(BaseModel):
    items: list[TopicTaxonomyOut]


def _topic_taxonomy_history_handler(
    payload: TopicTaxonomyHistoryInput,
    context: ToolContext,
) -> TopicTaxonomyHistoryOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    items = _list_records(
        context.db,
        TopicTaxonomy,
        status=payload.status,
        limit=payload.limit,
    )
    return TopicTaxonomyHistoryOutput(
        items=[TopicTaxonomyOut.model_validate(item) for item in items]
    )


def _topic_taxonomy_create_handler(
    payload: TopicTaxonomyCreate,
    context: ToolContext,
) -> TopicTaxonomyOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    taxonomy = _create_topic_taxonomy(context.db, payload)
    return TopicTaxonomyOut.model_validate(taxonomy)


def _topic_taxonomy_approve_handler(
    payload: TopicTaxonomyCreate,
    context: ToolContext,
) -> TopicTaxonomyOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    taxonomy = _create_topic_taxonomy(context.db, payload, status_override="approved")
    return TopicTaxonomyOut.model_validate(taxonomy)


def _topic_taxonomy_restore_handler(
    payload: TopicTaxonomyRestoreRequest,
    context: ToolContext,
) -> TopicTaxonomyOut:
    if context.db is None:
        raise RuntimeError("Database session missing")
    taxonomy = _restore_topic_taxonomy(context.db, payload)
    return TopicTaxonomyOut.model_validate(taxonomy)


def register_canonical_tools(registry: ToolRegistry) -> None:
    registry.register(
        ToolSpec(
            name="canonical.page_config.create",
            input_model=PageConfigVersionCreate,
            output_model=PageConfigVersionOut,
            handler=_page_config_create_handler,
            description="Create a page config version in the canonical store.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.page_config.latest",
            input_model=PageConfigLatestInput,
            output_model=PageConfigLatestOutput,
            handler=_page_config_latest_handler,
            description="Fetch the latest page config version.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.page_config.history",
            input_model=PageConfigHistoryInput,
            output_model=PageConfigHistoryOutput,
            handler=_page_config_history_handler,
            description="List recent page config versions.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.business_profile.latest",
            input_model=BusinessProfileLatestInput,
            output_model=BusinessProfileLatestOutput,
            handler=_business_profile_latest_handler,
            description="Fetch the latest business profile version.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.business_profile.create",
            input_model=BusinessProfileVersionCreate,
            output_model=BusinessProfileVersionOut,
            handler=_business_profile_create_handler,
            description="Create a business profile version in the canonical store.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.business_profile.approve",
            input_model=BusinessProfileVersionCreate,
            output_model=BusinessProfileVersionOut,
            handler=_business_profile_approve_handler,
            description="Create an approved business profile version in the canonical store.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.business_profile.history",
            input_model=BusinessProfileHistoryInput,
            output_model=BusinessProfileHistoryOutput,
            handler=_business_profile_history_handler,
            description="List recent business profile versions.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.site_structure.latest",
            input_model=SiteStructureLatestInput,
            output_model=SiteStructureLatestOutput,
            handler=_site_structure_latest_handler,
            description="Fetch the latest site structure version.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.site_structure.create",
            input_model=SiteStructureVersionCreate,
            output_model=SiteStructureVersionOut,
            handler=_site_structure_create_handler,
            description="Create a site structure version in the canonical store.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.site_structure.approve",
            input_model=SiteStructureVersionCreate,
            output_model=SiteStructureVersionOut,
            handler=_site_structure_approve_handler,
            description="Create an approved site structure version in the canonical store.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.site_structure.history",
            input_model=SiteStructureHistoryInput,
            output_model=SiteStructureHistoryOutput,
            handler=_site_structure_history_handler,
            description="List recent site structure versions.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.topic_taxonomy.latest",
            input_model=TopicTaxonomyLatestInput,
            output_model=TopicTaxonomyLatestOutput,
            handler=_topic_taxonomy_latest_handler,
            description="Fetch the latest topic taxonomy.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.topic_taxonomy.create",
            input_model=TopicTaxonomyCreate,
            output_model=TopicTaxonomyOut,
            handler=_topic_taxonomy_create_handler,
            description="Create a topic taxonomy entry.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.topic_taxonomy.approve",
            input_model=TopicTaxonomyCreate,
            output_model=TopicTaxonomyOut,
            handler=_topic_taxonomy_approve_handler,
            description="Create an approved topic taxonomy entry.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.topic_taxonomy.restore",
            input_model=TopicTaxonomyRestoreRequest,
            output_model=TopicTaxonomyOut,
            handler=_topic_taxonomy_restore_handler,
            description="Restore a topic taxonomy version from history.",
        )
    )
    registry.register(
        ToolSpec(
            name="canonical.topic_taxonomy.history",
            input_model=TopicTaxonomyHistoryInput,
            output_model=TopicTaxonomyHistoryOutput,
            handler=_topic_taxonomy_history_handler,
            description="List recent topic taxonomy versions.",
        )
    )
