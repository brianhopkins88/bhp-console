from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.agent_runs import AgentRun, AgentStep, ToolCallLog
from app.schemas.agent_runs import (
    AgentRunCreate,
    AgentRunOut,
    AgentRunUpdate,
    AgentStepCreate,
    AgentStepOut,
    AgentStepUpdate,
    ToolCallCreate,
    ToolCallOut,
    ToolCallUpdate,
)

router = APIRouter()


def _get_run_or_404(db: Session, run_id: str) -> AgentRun:
    run = db.get(AgentRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return run


def _get_step_or_404(db: Session, step_id: int) -> AgentStep:
    step = db.get(AgentStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Agent step not found")
    return step


def _get_tool_call_or_404(db: Session, tool_call_id: int) -> ToolCallLog:
    tool_call = db.get(ToolCallLog, tool_call_id)
    if not tool_call:
        raise HTTPException(status_code=404, detail="Tool call not found")
    return tool_call


@router.post("/agent-runs", response_model=AgentRunOut)
def create_run(payload: AgentRunCreate, db: Session = Depends(get_db)) -> AgentRun:
    run = AgentRun(
        goal=payload.goal,
        plan=payload.plan,
        run_metadata=payload.run_metadata,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.get("/agent-runs", response_model=list[AgentRunOut])
def list_runs(
    db: Session = Depends(get_db),
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[AgentRun]:
    stmt = select(AgentRun).order_by(AgentRun.created_at.desc()).offset(offset).limit(limit)
    if status:
        stmt = stmt.where(AgentRun.status == status)
    return db.execute(stmt).scalars().all()


@router.get("/agent-runs/{run_id}", response_model=AgentRunOut)
def get_run(run_id: str, db: Session = Depends(get_db)) -> AgentRun:
    return _get_run_or_404(db, run_id)


@router.patch("/agent-runs/{run_id}", response_model=AgentRunOut)
def update_run(
    run_id: str,
    payload: AgentRunUpdate,
    db: Session = Depends(get_db),
) -> AgentRun:
    run = _get_run_or_404(db, run_id)
    if payload.status:
        run.status = payload.status
        now = datetime.now(timezone.utc)
        if payload.status == "running" and run.started_at is None:
            run.started_at = now
        if payload.status in {"completed", "failed"}:
            run.completed_at = now
    if payload.outcome is not None:
        run.outcome = payload.outcome
    if payload.error_message is not None:
        run.error_message = payload.error_message
    db.commit()
    db.refresh(run)
    return run


@router.post("/agent-runs/{run_id}/steps", response_model=AgentStepOut)
def create_step(
    run_id: str,
    payload: AgentStepCreate,
    db: Session = Depends(get_db),
) -> AgentStep:
    _get_run_or_404(db, run_id)
    step = AgentStep(
        run_id=run_id,
        index=payload.index,
        label=payload.label,
        status=payload.status or "pending",
        input=payload.input,
        started_at=datetime.now(timezone.utc) if payload.status == "running" else None,
        completed_at=datetime.now(timezone.utc) if payload.status in {"completed", "failed"} else None,
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


@router.patch("/agent-steps/{step_id}", response_model=AgentStepOut)
def update_step(
    step_id: int,
    payload: AgentStepUpdate,
    db: Session = Depends(get_db),
) -> AgentStep:
    step = _get_step_or_404(db, step_id)
    if payload.status:
        step.status = payload.status
        now = datetime.now(timezone.utc)
        if payload.status == "running" and step.started_at is None:
            step.started_at = now
        if payload.status in {"completed", "failed"}:
            step.completed_at = now
    if payload.output is not None:
        step.output = payload.output
    if payload.error_message is not None:
        step.error_message = payload.error_message
    db.commit()
    db.refresh(step)
    return step


@router.post("/agent-runs/{run_id}/tool-calls", response_model=ToolCallOut)
def create_tool_call(
    run_id: str,
    payload: ToolCallCreate,
    db: Session = Depends(get_db),
) -> ToolCallLog:
    _get_run_or_404(db, run_id)
    if payload.step_id is not None:
        _get_step_or_404(db, payload.step_id)
    tool_call = ToolCallLog(
        run_id=run_id,
        step_id=payload.step_id,
        tool_name=payload.tool_name,
        status=payload.status or "running",
        correlation_id=payload.correlation_id,
        input=payload.input,
        output=payload.output,
        duration_ms=payload.duration_ms,
        error_message=payload.error_message,
    )
    db.add(tool_call)
    db.commit()
    db.refresh(tool_call)
    return tool_call


@router.patch("/tool-calls/{tool_call_id}", response_model=ToolCallOut)
def update_tool_call(
    tool_call_id: int,
    payload: ToolCallUpdate,
    db: Session = Depends(get_db),
) -> ToolCallLog:
    tool_call = _get_tool_call_or_404(db, tool_call_id)
    if payload.status:
        tool_call.status = payload.status
    if payload.output is not None:
        tool_call.output = payload.output
    if payload.duration_ms is not None:
        tool_call.duration_ms = payload.duration_ms
    if payload.error_message is not None:
        tool_call.error_message = payload.error_message
    db.commit()
    db.refresh(tool_call)
    return tool_call
