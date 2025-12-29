"""Add site ops tables (tests + deployments).

Revision ID: 0010_site_ops
Revises: 0009_topic_taxonomy_backfill
Create Date: 2025-02-06 14:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0010_site_ops"
down_revision = "0009_topic_taxonomy_backfill"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_test_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("version", sa.String(length=80), nullable=False),
        sa.Column("environment", sa.String(length=40), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'running'")),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("results", sa.JSON(), nullable=True),
        sa.Column("record_metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("site_test_runs", "status", server_default=None)

    op.create_table(
        "site_deployments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("environment", sa.String(length=40), nullable=False),
        sa.Column("version", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'completed'")),
        sa.Column("rollback_version", sa.String(length=80), nullable=True),
        sa.Column("record_metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deployed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("site_deployments", "status", server_default=None)


def downgrade() -> None:
    op.drop_table("site_deployments")
    op.drop_table("site_test_runs")
