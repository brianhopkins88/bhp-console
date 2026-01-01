"""Add canonical versioned state tables.

Revision ID: 0013_canonical_versions
Revises: 0012_business_profile_status
Create Date: 2025-02-15 10:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0013_canonical_versions"
down_revision = "0012_business_profile_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "business_profile_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "parent_version_id",
            sa.Integer(),
            sa.ForeignKey("business_profile_versions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("profile_data", sa.JSON(), nullable=True),
        sa.Column(
            "created_by", sa.String(length=120), nullable=False, server_default=sa.text("'user'")
        ),
        sa.Column(
            "source_run_id",
            sa.String(length=36),
            sa.ForeignKey("agent_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "commit_classification",
            sa.String(length=40),
            nullable=False,
            server_default=sa.text("'approval_required'"),
        ),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default=sa.text("'draft'")
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    op.create_table(
        "taxonomy_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_data", sa.JSON(), nullable=True),
        sa.Column("record_metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_by", sa.String(length=120), nullable=False, server_default=sa.text("'user'")
        ),
        sa.Column(
            "source_run_id",
            sa.String(length=36),
            sa.ForeignKey("agent_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    op.create_table(
        "site_structure_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "parent_version_id",
            sa.Integer(),
            sa.ForeignKey("site_structure_versions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "business_profile_version_id",
            sa.Integer(),
            sa.ForeignKey("business_profile_versions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("structure_data", sa.JSON(), nullable=True),
        sa.Column("selection_rules", sa.JSON(), nullable=True),
        sa.Column(
            "taxonomy_snapshot_id",
            sa.Integer(),
            sa.ForeignKey("taxonomy_snapshots.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by", sa.String(length=120), nullable=False, server_default=sa.text("'user'")
        ),
        sa.Column(
            "source_run_id",
            sa.String(length=36),
            sa.ForeignKey("agent_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "commit_classification",
            sa.String(length=40),
            nullable=False,
            server_default=sa.text("'approval_required'"),
        ),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default=sa.text("'draft'")
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    op.create_table(
        "page_config_versions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "parent_version_id",
            sa.Integer(),
            sa.ForeignKey("page_config_versions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "site_structure_version_id",
            sa.Integer(),
            sa.ForeignKey("site_structure_versions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("page_id", sa.String(length=120), nullable=False),
        sa.Column("config_data", sa.JSON(), nullable=True),
        sa.Column("selection_rules", sa.JSON(), nullable=True),
        sa.Column(
            "taxonomy_snapshot_id",
            sa.Integer(),
            sa.ForeignKey("taxonomy_snapshots.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by", sa.String(length=120), nullable=False, server_default=sa.text("'user'")
        ),
        sa.Column(
            "source_run_id",
            sa.String(length=36),
            sa.ForeignKey("agent_runs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "commit_classification",
            sa.String(length=40),
            nullable=False,
            server_default=sa.text("'approval_required'"),
        ),
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default=sa.text("'draft'")
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )


def downgrade() -> None:
    op.drop_table("page_config_versions")
    op.drop_table("site_structure_versions")
    op.drop_table("taxonomy_snapshots")
    op.drop_table("business_profile_versions")
