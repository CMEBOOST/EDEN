"""data integrity constraints

Revision ID: d1c0nstra1nts
Revises: c4f2a9b17d30
Create Date: 2026-09-02

- tenants.user_id UNIQUE (1 บัญชี ↔ 1 ผู้เช่า)
- contracts: partial unique index กัน 1 ห้อง มีสัญญา draft/active ซ้อน
- contracts: CHECK end_date >= start_date, rent/deposit >= 0
- rate_configs: CHECK rate_value >= 0
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1c0nstra1nts"
down_revision: Union[str, Sequence[str], None] = "c4f2a9b17d30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_tenants_user_id", "tenants", ["user_id"])
    op.create_index(
        "uq_contract_room_active",
        "contracts",
        ["room_id"],
        unique=True,
        postgresql_where=sa.text(
            "room_id IS NOT NULL AND status IN ('draft', 'active')"
        ),
    )
    op.create_check_constraint(
        "ck_contract_dates", "contracts", "end_date >= start_date"
    )
    op.create_check_constraint(
        "ck_contract_amounts", "contracts", "rent >= 0 AND security_deposit >= 0"
    )
    op.create_check_constraint(
        "ck_rate_value_nonneg", "rate_configs", "rate_value >= 0"
    )


def downgrade() -> None:
    op.drop_constraint("ck_rate_value_nonneg", "rate_configs", type_="check")
    op.drop_constraint("ck_contract_amounts", "contracts", type_="check")
    op.drop_constraint("ck_contract_dates", "contracts", type_="check")
    op.drop_index("uq_contract_room_active", table_name="contracts")
    op.drop_constraint("uq_tenants_user_id", "tenants", type_="unique")
