from sqlalchemy.orm import Session

from ..models import models


def write(db: Session, user_id: int | None, action: str) -> None:
    """บันทึก 1 บรรทัดลง audit_logs (best-effort — ไม่ให้ล้มพัง request หลัก)"""
    try:
        db.add(models.AuditLog(user_id=user_id, action=action[:255]))
        db.commit()
    except Exception:
        db.rollback()


def get_logs(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    user_id: int | None = None,
    q: str | None = None,
):
    query = db.query(models.AuditLog, models.Users.username).outerjoin(
        models.Users, models.AuditLog.user_id == models.Users.user_id
    )
    if user_id is not None:
        query = query.filter(models.AuditLog.user_id == user_id)
    if q:
        query = query.filter(models.AuditLog.action.ilike(f"%{q}%"))

    rows = query.order_by(models.AuditLog.log_id.desc()).offset(skip).limit(limit).all()
    return [
        {
            "log_id": log.log_id,
            "action": log.action,
            "created_at": log.created_at,
            "user_id": log.user_id,
            "username": username,
        }
        for log, username in rows
    ]
