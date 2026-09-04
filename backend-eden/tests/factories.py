"""ตัวช่วยสร้างข้อมูลทดสอบ — เรียกจากเทสต์ผ่าน fixture `db`"""

import datetime
import itertools

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import models

_counter = itertools.count(1)


def raw_national_id(db: Session, tenant_id: int) -> str | None:
    """อ่าน ciphertext ดิบจากคอลัมน์ (ORM attribute จะ decrypt ให้อัตโนมัติ)"""
    return db.execute(
        text("SELECT national_id_encrypted FROM tenants WHERE tenant_id = :i"),
        {"i": tenant_id},
    ).scalar()


def make_user(
    db: Session,
    role: models.Role = models.Role.staff,
    *,
    username: str | None = None,
    password: str = "pw",
    is_active: bool = True,
) -> models.Users:
    user = models.Users(
        username=username or f"{role.value}{next(_counter)}",
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_tenant(
    db: Session,
    *,
    user: models.Users | None = None,
    full_name: str = "ผู้เช่าทดสอบ",
    phone: str = "0800000000",
    email: str | None = None,
    **kw,
) -> models.Tenants:
    if user is None:
        user = make_user(db, models.Role.tenant)
    tenant = models.Tenants(
        user_id=user.user_id,
        full_name=full_name,
        phone=phone,
        email=email or f"{user.username}@example.com",
        **kw,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


def make_room(
    db: Session, room_id: int = 105, *, floor: int = 1, base_rent: float = 4500
) -> models.Room:
    room = db.get(models.Room, room_id)
    if room is None:
        room = models.Room(room_id=room_id, floor=floor, base_rent=base_rent)
        db.add(room)
        db.commit()
        db.refresh(room)
    return room


def make_contract(
    db: Session,
    *,
    tenant: models.Tenants | None = None,
    room_id: int | None = 101,
    status: models.ContractStatus = models.ContractStatus.draft,
    start_date: datetime.date | None = None,
    end_date: datetime.date | None = None,
    rent: float = 4500,
    security_deposit: float = 4500,
    **kw,
) -> models.Contracts:
    if tenant is None:
        tenant = make_tenant(db)
    contract = models.Contracts(
        tenant_id=tenant.tenant_id,
        room_id=room_id,
        status=status,
        start_date=start_date or datetime.date(2026, 1, 1),
        end_date=end_date or datetime.date(2026, 12, 31),
        rent=rent,
        security_deposit=security_deposit,
        **kw,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract
