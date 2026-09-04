"""rooms table (demo) + contracts.room_id FK

Revision ID: c4f2a9b17d30
Revises: b33c320591bb
Create Date: 2026-09-01 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4f2a9b17d30"
down_revision: Union[str, Sequence[str], None] = "b33c320591bb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ชั้น -> ค่าเช่าตั้งต้น
_FLOOR_RENT = {1: 4500, 2: 4000, 3: 3500, 4: 3000}


def _seed_rows():
    rows = []
    for floor in (1, 2, 3, 4):
        for n in range(1, 11):
            rows.append(
                {
                    "room_id": floor * 100 + n,  # 101..110, 201..210, ...
                    "floor": floor,
                    "base_rent": _FLOOR_RENT[floor],
                }
            )
    return rows


def upgrade() -> None:
    rooms = op.create_table(
        "rooms",
        sa.Column("room_id", sa.Integer(), nullable=False),  # = เลขห้อง
        sa.Column("floor", sa.Integer(), nullable=False),
        sa.Column("base_rent", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.PrimaryKeyConstraint("room_id"),
    )
    op.create_index(op.f("ix_rooms_floor"), "rooms", ["floor"], unique=False)

    op.bulk_insert(rooms, _seed_rows())

    # ล้างค่า room_id เก่าที่ไม่ตรงกับห้องจริง (demo data เดิม เช่น 1, 2, 999)
    op.execute(
        "UPDATE contracts SET room_id = NULL "
        "WHERE room_id IS NOT NULL "
        "AND room_id NOT IN (SELECT room_id FROM rooms)"
    )

    op.create_foreign_key(
        "fk_contracts_room_id",
        "contracts",
        "rooms",
        ["room_id"],
        ["room_id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_contracts_room_id", "contracts", type_="foreignkey")
    op.drop_index(op.f("ix_rooms_floor"), table_name="rooms")
    op.drop_table("rooms")
