from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from packages.domain.db.base import Base


class BusinessProfileVersion(Base):
    __tablename__ = "business_profile_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("business_profile_versions.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_data: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), nullable=False, default="user")
    source_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True
    )
    commit_classification: Mapped[str] = mapped_column(
        String(40), nullable=False, default="approval_required"
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SiteStructureVersion(Base):
    __tablename__ = "site_structure_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("site_structure_versions.id", ondelete="SET NULL"), nullable=True
    )
    business_profile_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("business_profile_versions.id", ondelete="SET NULL"), nullable=True
    )
    structure_data: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    selection_rules: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    taxonomy_snapshot_id: Mapped[int | None] = mapped_column(
        ForeignKey("taxonomy_snapshots.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[str] = mapped_column(String(120), nullable=False, default="user")
    source_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True
    )
    commit_classification: Mapped[str] = mapped_column(
        String(40), nullable=False, default="approval_required"
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PageConfigVersion(Base):
    __tablename__ = "page_config_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("page_config_versions.id", ondelete="SET NULL"), nullable=True
    )
    site_structure_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("site_structure_versions.id", ondelete="SET NULL"), nullable=True
    )
    page_id: Mapped[str] = mapped_column(String(120), nullable=False)
    config_data: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    selection_rules: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    taxonomy_snapshot_id: Mapped[int | None] = mapped_column(
        ForeignKey("taxonomy_snapshots.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[str] = mapped_column(String(120), nullable=False, default="user")
    source_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True
    )
    commit_classification: Mapped[str] = mapped_column(
        String(40), nullable=False, default="approval_required"
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class TaxonomySnapshot(Base):
    __tablename__ = "taxonomy_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_data: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    record_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), nullable=False, default="user")
    source_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
