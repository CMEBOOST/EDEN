from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import models

# สัญญาที่ยัง "กินห้อง" อยู่ = ยังไม่จบ (draft / active)
_ACTIVE = (models.ContractStatus.draft, models.ContractStatus.active)


def get_rooms(db: Session, available_only: bool = False):
    """คืน list ของ (Room, occupying_contract_id | None) เรียงตามเลขห้อง

    สถานะห้องคำนวณสดจาก contracts — ไม่เก็บใน rooms
    """
    occ = (
        db.query(
            models.Contracts.room_id.label("room_id"),
            func.min(models.Contracts.contract_id).label("contract_id"),
        )
        .filter(models.Contracts.status.in_(_ACTIVE))
        .filter(models.Contracts.room_id.isnot(None))
        .group_by(models.Contracts.room_id)
        .subquery()
    )

    rows = (
        db.query(models.Room, occ.c.contract_id)
        .outerjoin(occ, occ.c.room_id == models.Room.room_id)
        .order_by(models.Room.room_id)
        .all()
    )
    if available_only:
        rows = [r for r in rows if r[1] is None]
    return rows


def room_exists(db: Session, room_id: int) -> bool:
    return db.get(models.Room, room_id) is not None


def active_contract_for_room(
    db: Session, room_id: int, exclude_contract_id: int | None = None
) -> int | None:
    """contract_id ของสัญญา draft/active ที่ครองห้องนี้อยู่ (ไม่มี = None)"""
    q = db.query(models.Contracts.contract_id).filter(
        models.Contracts.room_id == room_id,
        models.Contracts.status.in_(_ACTIVE),
    )
    if exclude_contract_id is not None:
        q = q.filter(models.Contracts.contract_id != exclude_contract_id)
    row = q.first()
    return row[0] if row else None
