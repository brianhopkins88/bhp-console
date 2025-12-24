"""Add OpenAI usage tracking table.

Revision ID: 0004_openai_usage
Revises: 0003_tag_taxonomy
Create Date: 2025-02-05 14:15:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_openai_usage"
down_revision = "0003_tag_taxonomy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "openai_usage",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("total_tokens", sa.Integer(), nullable=False, server_default=sa.text("0")),
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
        sa.Column("last_reset_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("INSERT INTO openai_usage (id, total_tokens) VALUES (1, 0)")
    op.alter_column("openai_usage", "total_tokens", server_default=None)


def downgrade() -> None:
    op.drop_table("openai_usage")
