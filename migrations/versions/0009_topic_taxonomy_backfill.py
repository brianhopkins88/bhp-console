"""Backfill topic taxonomy from legacy tag taxonomy.

Revision ID: 0009_topic_taxonomy_backfill
Revises: 0008_vector_memory
Create Date: 2025-02-06 13:00:00.000000
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

revision = "0009_topic_taxonomy_backfill"
down_revision = "0008_vector_memory"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = bind.execute(sa.text("SELECT COUNT(*) FROM topic_taxonomies")).scalar()
    if existing and int(existing) > 0:
        return

    rows = bind.execute(sa.text("SELECT tag, status FROM tag_taxonomy")).fetchall()
    if not rows:
        return

    tags: list[dict] = []
    statuses: list[str] = []
    for tag, status in rows:
        tag_value = str(tag)
        status_value = str(status)
        tags.append(
            {
                "id": tag_value,
                "label": tag_value,
                "parent_id": None,
                "status": status_value,
            }
        )
        statuses.append(status_value)

    overall_status = "approved" if statuses and all(s == "approved" for s in statuses) else "draft"
    approved_at = datetime.now(timezone.utc) if overall_status == "approved" else None
    payload = {"tags": tags}

    bind.execute(
        sa.text(
            "INSERT INTO topic_taxonomies (status, taxonomy_data, approved_at) "
            "VALUES (:status, :taxonomy_data, :approved_at)"
        ),
        {
            "status": overall_status,
            "taxonomy_data": json.dumps(payload, ensure_ascii=True, sort_keys=True),
            "approved_at": approved_at,
        },
    )


def downgrade() -> None:
    pass
