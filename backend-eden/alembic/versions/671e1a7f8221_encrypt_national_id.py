"""encrypt tenants.national_id_encrypted (data migration)

Revision ID: 671e1a7f8221
Revises: d1c0nstra1nts
Create Date: 2026-09-02

แปลงค่า national_id_encrypted ที่เป็น plaintext → Fernet token
(schema ไม่เปลี่ยน — ยังเป็น VARCHAR(255)) · idempotent + reversible
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.crypto import decrypt, encrypt


revision: str = "671e1a7f8221"
down_revision: Union[str, Sequence[str], None] = "d1c0nstra1nts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SELECT = sa.text(
    "SELECT tenant_id, national_id_encrypted FROM tenants "
    "WHERE national_id_encrypted IS NOT NULL"
)
_UPDATE = sa.text("UPDATE tenants SET national_id_encrypted = :v WHERE tenant_id = :id")


def upgrade() -> None:
    conn = op.get_bind()
    for tid, val in conn.execute(_SELECT).fetchall():
        if decrypt(val) is not None:
            continue  # เข้ารหัสอยู่แล้ว
        conn.execute(_UPDATE, {"v": encrypt(val), "id": tid})


def downgrade() -> None:
    conn = op.get_bind()
    for tid, val in conn.execute(_SELECT).fetchall():
        plain = decrypt(val)
        if plain is not None:
            conn.execute(_UPDATE, {"v": plain, "id": tid})
