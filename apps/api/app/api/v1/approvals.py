from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_auth
from app.db.session import get_db
from app.models.agent_runs import AgentRun, ToolCallLog
from app.models.approvals import Approval
from app.schemas.approvals import ApprovalCreate, ApprovalDecision, ApprovalOut

router = APIRouter(dependencies=[Depends(require_api_auth)])


def _get_approval_or_404(db: Session, approval_id: int) -> Approval:
    approval = db.get(Approval, approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    return approval


@router.post("/approvals", response_model=ApprovalOut)
def create_approval(payload: ApprovalCreate, db: Session = Depends(get_db)) -> Approval:
    if payload.run_id:
        if db.get(AgentRun, payload.run_id) is None:
            raise HTTPException(status_code=404, detail="Agent run not found")
    if payload.tool_call_id:
        if db.get(ToolCallLog, payload.tool_call_id) is None:
            raise HTTPException(status_code=404, detail="Tool call not found")
    approval = Approval(
        action=payload.action,
        proposal=payload.proposal,
        requester=payload.requester,
        run_id=payload.run_id,
        tool_call_id=payload.tool_call_id,
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval


@router.get("/approvals", response_model=list[ApprovalOut])
def list_approvals(
    db: Session = Depends(get_db),
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[Approval]:
    stmt = select(Approval).order_by(Approval.created_at.desc()).offset(offset).limit(limit)
    if status:
        stmt = stmt.where(Approval.status == status)
    return db.execute(stmt).scalars().all()


@router.get("/approvals/{approval_id}", response_model=ApprovalOut)
def get_approval(approval_id: int, db: Session = Depends(get_db)) -> Approval:
    return _get_approval_or_404(db, approval_id)


@router.post("/approvals/{approval_id}/decision", response_model=ApprovalOut)
def decide_approval(
    approval_id: int,
    payload: ApprovalDecision,
    db: Session = Depends(get_db),
) -> Approval:
    approval = _get_approval_or_404(db, approval_id)
    approval.status = payload.status
    approval.decided_by = payload.decided_by
    approval.decision_notes = payload.decision_notes
    approval.outcome = payload.outcome
    approval.decided_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(approval)
    return approval
