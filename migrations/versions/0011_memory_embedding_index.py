"""Add vector index for memory embeddings.

Revision ID: 0011_memory_embedding_index
Revises: 0010_site_ops
Create Date: 2025-02-06 15:00:00.000000
"""

from __future__ import annotations

from alembic import op

revision = "0011_memory_embedding_index"
down_revision = "0010_site_ops"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_memory_embeddings_embedding "
        "ON memory_embeddings USING ivfflat (embedding vector_cosine_ops) "
        "WITH (lists = 100)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_memory_embeddings_embedding")
