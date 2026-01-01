"""Add topic taxonomy change log table.

Revision ID: 0014_topic_taxonomy_changes
Revises: 0013_canonical_versions
Create Date: 2025-02-15 10:30:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0014_topic_taxonomy_changes"
down_revision = "0013_canonical_versions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "topic_taxonomy_changes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "taxonomy_id",
            sa.Integer(),
            sa.ForeignKey("topic_taxonomies.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("change_type", sa.String(length=30), nullable=False),
        sa.Column("taxonomy_data", sa.JSON(), nullable=True),
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


def downgrade() -> None:
    op.drop_table("topic_taxonomy_changes")
