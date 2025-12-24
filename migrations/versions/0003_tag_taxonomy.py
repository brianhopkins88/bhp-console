"""Add tag taxonomy table.

Revision ID: 0003_tag_taxonomy
Revises: 0002_asset_role_publish
Create Date: 2025-02-05 12:30:00.000000
"""

from __future__ import annotations

from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

revision = "0003_tag_taxonomy"
down_revision = "0002_asset_role_publish"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tag_taxonomy",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tag", sa.String(length=80), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("tag", name="uix_tag_taxonomy_tag"),
    )

    now = datetime.now(timezone.utc)
    tag_table = sa.table(
        "tag_taxonomy",
        sa.column("tag", sa.String),
        sa.column("status", sa.String),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("approved_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        tag_table,
        [
            {"tag": "family", "status": "approved", "created_at": now, "approved_at": now},
            {"tag": "portrait", "status": "approved", "created_at": now, "approved_at": now},
            {"tag": "party", "status": "approved", "created_at": now, "approved_at": now},
            {"tag": "graduation", "status": "approved", "created_at": now, "approved_at": now},
            {"tag": "commercial", "status": "approved", "created_at": now, "approved_at": now},
            {"tag": "wildlife", "status": "approved", "created_at": now, "approved_at": now},
            {"tag": "travel", "status": "approved", "created_at": now, "approved_at": now},
        ],
    )

    op.alter_column("tag_taxonomy", "status", server_default=None)


def downgrade() -> None:
    op.drop_table("tag_taxonomy")
