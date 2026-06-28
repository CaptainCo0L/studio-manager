"""batch monthly_fee

Adds batches.monthly_fee for dues/fee tracking.

Revision ID: 0002_batch_monthly_fee
Revises: 0001_baseline
Create Date: 2026-06-28
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_batch_monthly_fee"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ponytail: guarded add — the 0001 baseline builds tables from live metadata
    # (create_all), which already includes this column, so on a fresh DB the
    # column exists; the guard makes `upgrade head` a safe no-op there. On an
    # existing pre-feature DB the column is absent and gets added.
    bind = op.get_bind()
    cols = [c["name"] for c in sa.inspect(bind).get_columns("batches")]
    if "monthly_fee" not in cols:
        op.add_column("batches", sa.Column("monthly_fee", sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("batches", "monthly_fee")
