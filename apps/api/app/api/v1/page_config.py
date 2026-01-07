from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from fastapi import HTTPException

from app.api.deps import require_commit_approval
from app.db.session import get_db
from packages.domain.models.canonical import PageConfigVersion
from packages.domain.schemas.canonical import PageConfigVersionCreate, PageConfigVersionOut
from packages.domain.services.page_config import (
    create_page_config_version,
    get_latest_page_config as get_latest_page_config_service,
    list_page_config_history as list_page_config_history_service,
)

router = APIRouter()


def _reject_canonical_write() -> None:
    raise HTTPException(
        status_code=409,
        detail="Canonical writes must be executed via the tool gateway (POST /api/v1/tools/execute).",
    )
@router.post("/site/page-config", response_model=PageConfigVersionOut)
def create_page_config(
    payload: PageConfigVersionCreate,
    approval_id: int | None = None,
    db: Session = Depends(get_db),
) -> PageConfigVersion:
    _reject_canonical_write()
    commit_classification = payload.commit_classification or "approval_required"
    require_commit_approval(
        commit_classification,
        approval_id,
        action="api.site.page_config.create",
        db=db,
    )
    return create_page_config_version(db, payload)


@router.get("/site/page-config", response_model=PageConfigVersionOut | None)
def get_latest_page_config(
    page_id: str | None = None,
    status: str | None = None,
    site_structure_version_id: int | None = None,
    db: Session = Depends(get_db),
) -> PageConfigVersion | None:
    return get_latest_page_config_service(
        db,
        status=status,
        page_id=page_id,
        site_structure_version_id=site_structure_version_id,
    )


@router.get("/site/page-config/history", response_model=list[PageConfigVersionOut])
def list_page_config_history(
    page_id: str | None = None,
    site_structure_version_id: int | None = None,
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[PageConfigVersion]:
    return list_page_config_history_service(
        db,
        page_id=page_id,
        site_structure_version_id=site_structure_version_id,
        limit=limit,
    )
