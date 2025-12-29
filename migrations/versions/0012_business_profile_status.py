"""Add status and approval tracking to business profiles.

Revision ID: 0012_business_profile_status
Revises: 0011_memory_embedding_index
Create Date: 2025-02-08 10:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0012_business_profile_status"
down_revision = "0011_memory_embedding_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "business_profiles",
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'draft'")),
    )
    op.add_column(
        "business_profiles",
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE business_profiles "
        "SET status = 'approved', approved_at = COALESCE(updated_at, created_at)"
    )
    op.alter_column("business_profiles", "status", server_default=None)


def downgrade() -> None:
    op.drop_column("business_profiles", "approved_at")
    op.drop_column("business_profiles", "status")
