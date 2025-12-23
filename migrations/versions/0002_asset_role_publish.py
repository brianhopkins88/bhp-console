"""Add published flag to asset roles.

Revision ID: 0002_asset_role_publish
Revises: 0001_assets
Create Date: 2025-02-02 12:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_asset_role_publish"
down_revision = "0001_assets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "asset_roles",
        sa.Column(
            "is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )
    op.alter_column("asset_roles", "is_published", server_default=None)


def downgrade() -> None:
    op.drop_column("asset_roles", "is_published")
