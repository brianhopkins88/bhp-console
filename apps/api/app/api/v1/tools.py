from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ValidationError
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.deps import require_api_auth
from app.core.settings import settings
from app.db.session import get_db
from app.models.agent_runs import AgentRun, AgentStep, ToolCallLog
from app.models.approvals import Approval
from app.models.site_ops import SiteDeployment, SiteTestRun
from app.schemas.tools import ToolExecuteRequest, ToolExecuteResponse
from packages.policy.engine import PolicyEngine
from packages.tools.builtins import register_builtin_tools
from packages.tools.registry import ToolContext, ToolRegistry, ToolSpec

router = APIRouter(dependencies=[Depends(require_api_auth)])

_registry = ToolRegistry()
register_builtin_tools(_registry)
_policy_engine = PolicyEngine()


class RunChecksInput(BaseModel):
    version: str
    environment: str = "staging"
    status: str | None = None
    summary: str | None = None
    results: dict | list | None = None


class RunChecksOutput(BaseModel):
    test_run_id: int
    status: str


def _run_checks_handler(payload: RunChecksInput, context: ToolContext) -> RunChecksOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    status = payload.status or "passed"
    checks: list[dict] = []
    try:
        context.db.execute(text("SELECT 1"))
        checks.append({"name": "db", "status": "passed"})
    except Exception as exc:  # noqa: BLE001
        checks.append({"name": "db", "status": "failed", "error": f"{exc.__class__.__name__}: {exc}"})
        status = "failed"

    if settings.assets_storage_root:
        import os

        if os.path.exists(settings.assets_storage_root):
            checks.append({"name": "storage", "status": "passed"})
        else:
            checks.append({"name": "storage", "status": "failed", "error": "assets storage missing"})
            status = "failed"

    if payload.results:
        if isinstance(payload.results, dict):
            extra_checks = payload.results.get("checks")
            if isinstance(extra_checks, list):
                checks.extend(extra_checks)
        elif isinstance(payload.results, list):
            checks.extend(payload.results)

    results = {"checks": checks}
    completed_at = datetime.now(timezone.utc) if status in {"passed", "failed"} else None
    test = SiteTestRun(
        version=payload.version,
        environment=payload.environment,
        status=status,
        summary=payload.summary or f"{len(checks)} checks executed",
        results=results,
        completed_at=completed_at,
    )
    context.db.add(test)
    context.db.commit()
    context.db.refresh(test)
    return RunChecksOutput(test_run_id=test.id, status=test.status)


_registry.register(
    ToolSpec(
        name="website.run_checks",
        input_model=RunChecksInput,
        output_model=RunChecksOutput,
        handler=_run_checks_handler,
        description="Run automated checks and persist a test run.",
    )
)


class DeployInput(BaseModel):
    target: str
    version: str
    status: str = "completed"
    record_metadata: dict | None = None


class DeployOutput(BaseModel):
    deployment_id: int
    status: str
    rollback_version: str | None


def _deploy_handler(payload: DeployInput, context: ToolContext) -> DeployOutput:
    if context.db is None:
        raise RuntimeError("Database session missing")
    status = payload.status or "completed"
    deployed_at = datetime.now(timezone.utc) if status == "completed" else None
    prev = context.db.execute(
        select(SiteDeployment)
        .where(SiteDeployment.environment == payload.target)
        .order_by(SiteDeployment.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    rollback_version = prev.version if prev and prev.version != payload.version else None
    deployment = SiteDeployment(
        environment=payload.target,
        version=payload.version,
        status=status,
        rollback_version=rollback_version,
        record_metadata=payload.record_metadata,
        deployed_at=deployed_at,
    )
    context.db.add(deployment)
    context.db.commit()
    context.db.refresh(deployment)
    return DeployOutput(
        deployment_id=deployment.id,
        status=deployment.status,
        rollback_version=deployment.rollback_version,
    )


_registry.register(
    ToolSpec(
        name="website.deploy",
        input_model=DeployInput,
        output_model=DeployOutput,
        handler=_deploy_handler,
        requires_approval=True,
        description="Record a deployment after checks pass (approval required).",
    )
)


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


@router.post("/tools/execute", response_model=ToolExecuteResponse)
def execute_tool(payload: ToolExecuteRequest, db: Session = Depends(get_db)) -> ToolExecuteResponse:
    _get_run_or_404(db, payload.run_id)
    if payload.step_id is not None:
        _get_step_or_404(db, payload.step_id)

    tool = _registry.get(payload.tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    approval: Approval | None = None
    tool_call: ToolCallLog | None = None
    if payload.approval_id is not None:
        approval = db.get(Approval, payload.approval_id)
        if not approval:
            raise HTTPException(status_code=404, detail="Approval not found")
        if approval.action != payload.tool_name:
            raise HTTPException(status_code=400, detail="Approval does not match tool")
        if approval.run_id and approval.run_id != payload.run_id:
            raise HTTPException(status_code=409, detail="Approval does not match run")
        if approval.status != "approved":
            raise HTTPException(status_code=409, detail="Approval not granted")
        if approval.tool_call_id is not None:
            tool_call = db.get(ToolCallLog, approval.tool_call_id)
            if tool_call and tool_call.tool_name != payload.tool_name:
                raise HTTPException(status_code=409, detail="Approval tool call mismatch")

    if tool_call is None:
        tool_call = ToolCallLog(
            run_id=payload.run_id,
            step_id=payload.step_id,
            tool_name=payload.tool_name,
            status="running",
            correlation_id=payload.correlation_id,
            input=payload.input,
        )
        db.add(tool_call)
        db.commit()
        db.refresh(tool_call)
        if approval and approval.tool_call_id is None:
            approval.tool_call_id = tool_call.id
            db.commit()
    else:
        tool_call.status = "running"
        tool_call.step_id = payload.step_id
        tool_call.correlation_id = payload.correlation_id
        tool_call.input = payload.input
        db.commit()

    try:
        validated_input = tool.input_model.model_validate(payload.input)
    except ValidationError as exc:
        tool_call.status = "failed"
        tool_call.error_message = exc.errors().__str__()
        db.commit()
        raise HTTPException(status_code=400, detail="Tool input validation failed") from exc

    context = ToolContext(
        run_id=payload.run_id,
        step_id=payload.step_id,
        requester=payload.requester,
        db=db,
    )

    if tool.name == "website.deploy":
        target = getattr(validated_input, "target", None)
        version = getattr(validated_input, "version", None)
        if target and version:
            latest = db.execute(
                select(SiteTestRun)
                .where(
                    SiteTestRun.version == version,
                    SiteTestRun.environment == target,
                )
                .order_by(SiteTestRun.created_at.desc())
                .limit(1)
            ).scalar_one_or_none()
            if not latest or latest.status != "passed":
                tool_call.status = "blocked"
                tool_call.error_message = "Checks not passed for target environment."
                db.commit()
                raise HTTPException(
                    status_code=409,
                    detail="Checks must pass before staging deploy.",
                )

    decision = _policy_engine.evaluate(tool, context)
    if decision.denied:
        tool_call.status = "denied"
        tool_call.error_message = decision.reason
        db.commit()
        raise HTTPException(status_code=403, detail=decision.reason or "Denied by policy")

    if decision.requires_approval and approval is None:
        approval = Approval(
            action=tool.name,
            proposal=payload.input,
            requester=payload.requester or "system",
            status="pending",
            run_id=payload.run_id,
            tool_call_id=tool_call.id,
        )
        tool_call.status = "requires_approval"
        db.add(approval)
        db.commit()
        db.refresh(approval)
        return ToolExecuteResponse(
            status="requires_approval",
            tool_call_id=tool_call.id,
            approval_id=approval.id,
            reason=decision.reason,
        )

    start = time.perf_counter()
    try:
        output = tool.handler(validated_input, context)
        validated_output = tool.output_model.model_validate(output)
        tool_call.output = validated_output.model_dump()
        tool_call.status = "completed"
    except ValidationError as exc:
        tool_call.status = "failed"
        tool_call.error_message = exc.errors().__str__()
        db.commit()
        raise HTTPException(status_code=500, detail="Tool output validation failed") from exc
    except Exception as exc:  # noqa: BLE001
        tool_call.status = "failed"
        tool_call.error_message = f"{exc.__class__.__name__}: {exc}"
        db.commit()
        raise HTTPException(status_code=500, detail="Tool execution failed") from exc
    finally:
        tool_call.duration_ms = int((time.perf_counter() - start) * 1000)
        db.commit()

    return ToolExecuteResponse(
        status="completed",
        tool_call_id=tool_call.id,
        output=tool_call.output,
    )
