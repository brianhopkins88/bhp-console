"""add auth recovery fields

Revision ID: 0016_auth_recovery_fields
Revises: 0015_auth_tables
Create Date: 2025-01-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0016_auth_recovery_fields"
down_revision = "0015_auth_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("auth_users", sa.Column("recovery_question", sa.String(length=255)))
    op.add_column("auth_users", sa.Column("recovery_answer_hash", sa.String(length=255)))
    op.add_column("auth_users", sa.Column("recovery_updated_at", sa.DateTime(timezone=True)))


def downgrade() -> None:
    op.drop_column("auth_users", "recovery_updated_at")
    op.drop_column("auth_users", "recovery_answer_hash")
    op.drop_column("auth_users", "recovery_question")
