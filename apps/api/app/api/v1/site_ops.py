from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.site_ops import SiteDeployment, SiteTestRun
from app.schemas.site_ops import (
    SiteDeploymentCreate,
    SiteDeploymentOut,
    SiteTestRunCreate,
    SiteTestRunOut,
    SiteTestRunUpdate,
)

router = APIRouter()


def _get_test_or_404(db: Session, test_id: int) -> SiteTestRun:
    test = db.get(SiteTestRun, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test run not found")
    return test


def _get_deploy_or_404(db: Session, deployment_id: int) -> SiteDeployment:
    deployment = db.get(SiteDeployment, deployment_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment


@router.post("/site/tests", response_model=SiteTestRunOut)
def create_test_run(payload: SiteTestRunCreate, db: Session = Depends(get_db)) -> SiteTestRun:
    status = payload.status or "running"
    completed_at = datetime.now(timezone.utc) if status in {"passed", "failed"} else None
    test = SiteTestRun(
        version=payload.version,
        environment=payload.environment,
        status=status,
        summary=payload.summary,
        results=payload.results,
        record_metadata=payload.record_metadata,
        completed_at=completed_at,
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.patch("/site/tests/{test_id}", response_model=SiteTestRunOut)
def update_test_run(
    test_id: int,
    payload: SiteTestRunUpdate,
    db: Session = Depends(get_db),
) -> SiteTestRun:
    test = _get_test_or_404(db, test_id)
    if payload.status:
        test.status = payload.status
        if payload.status in {"passed", "failed"}:
            test.completed_at = datetime.now(timezone.utc)
    if payload.summary is not None:
        test.summary = payload.summary
    if payload.results is not None:
        test.results = payload.results
    if payload.record_metadata is not None:
        test.record_metadata = payload.record_metadata
    db.commit()
    db.refresh(test)
    return test


@router.get("/site/tests", response_model=list[SiteTestRunOut])
def list_test_runs(
    db: Session = Depends(get_db),
    status: str | None = None,
    version: str | None = None,
    environment: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[SiteTestRun]:
    stmt = select(SiteTestRun).order_by(SiteTestRun.created_at.desc()).offset(offset).limit(limit)
    if status:
        stmt = stmt.where(SiteTestRun.status == status)
    if version:
        stmt = stmt.where(SiteTestRun.version == version)
    if environment:
        stmt = stmt.where(SiteTestRun.environment == environment)
    return db.execute(stmt).scalars().all()


@router.get("/site/tests/{test_id}", response_model=SiteTestRunOut)
def get_test_run(test_id: int, db: Session = Depends(get_db)) -> SiteTestRun:
    return _get_test_or_404(db, test_id)


@router.post("/site/deployments", response_model=SiteDeploymentOut)
def create_deployment(
    payload: SiteDeploymentCreate,
    db: Session = Depends(get_db),
) -> SiteDeployment:
    status = payload.status or "completed"
    deployed_at = datetime.now(timezone.utc) if status == "completed" else None

    prev = db.execute(
        select(SiteDeployment)
        .where(SiteDeployment.environment == payload.environment)
        .order_by(SiteDeployment.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    rollback_version = prev.version if prev and prev.version != payload.version else None

    deployment = SiteDeployment(
        environment=payload.environment,
        version=payload.version,
        status=status,
        rollback_version=rollback_version,
        record_metadata=payload.record_metadata,
        deployed_at=deployed_at,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    return deployment


@router.get("/site/deployments", response_model=list[SiteDeploymentOut])
def list_deployments(
    db: Session = Depends(get_db),
    environment: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[SiteDeployment]:
    stmt = select(SiteDeployment).order_by(SiteDeployment.created_at.desc()).offset(offset).limit(limit)
    if environment:
        stmt = stmt.where(SiteDeployment.environment == environment)
    return db.execute(stmt).scalars().all()


@router.get("/site/deployments/{deployment_id}", response_model=SiteDeploymentOut)
def get_deployment(
    deployment_id: int,
    db: Session = Depends(get_db),
) -> SiteDeployment:
    return _get_deploy_or_404(db, deployment_id)
