"""Add asset auto-tag job tracking.

Revision ID: 0005_asset_autotag_jobs
Revises: 0004_openai_usage
Create Date: 2025-02-05 15:10:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005_asset_autotag_jobs"
down_revision = "0004_openai_usage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "asset_auto_tag_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("asset_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'queued'")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("asset_id", name="uix_asset_autotag_asset"),
    )
    op.alter_column("asset_auto_tag_jobs", "status", server_default=None)


def downgrade() -> None:
    op.drop_table("asset_auto_tag_jobs")
