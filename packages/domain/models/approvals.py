from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.domain.db.base import Base


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    proposal: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    requester: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    decided_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    decision_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True
    )
    tool_call_id: Mapped[int | None] = mapped_column(
        ForeignKey("tool_call_logs.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    run: Mapped["AgentRun"] = relationship()
    tool_call: Mapped["ToolCallLog"] = relationship()
