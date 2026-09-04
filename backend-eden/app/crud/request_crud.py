"""CRUD สำหรับคำแจ้งความจำนงล่วงหน้า (ต่อสัญญา / ยุติสัญญา)"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import models
from ..schemas import schemas

_OPEN_STATUSES = (
    models.RequestStatus.pending.value,
    models.RequestStatus.accepted.value,
)

# state machine (lenient) — completed/rejected = terminal
_NEXT = {
    models.RequestStatus.pending: {
        models.RequestStatus.accepted,
        models.RequestStatus.rejected,
        models.RequestStatus.completed,
    },
    models.RequestStatus.accepted: {
        models.RequestStatus.rejected,
        models.RequestStatus.completed,
    },
    models.RequestStatus.rejected: set(),
    models.RequestStatus.completed: set(),
}


def _row_to_dict(
    req: models.ContractRequest, tenant_name: str, room_id, end_date, deposit
) -> dict:
    return {
        "request_id": req.request_id,
        "contract_id": req.contract_id,
        "request_type": req.request_type,
        "status": req.status,
        "tenant_note": req.tenant_note,
        "preferred_date": req.preferred_date,
        "staff_note": req.staff_note,
        "damage_total": req.damage_total,
        "created_at": req.created_at,
        "handled_at": req.handled_at,
        "tenant_name": tenant_name,
        "room_id": room_id,
        "contract_end_date": end_date,
        "security_deposit": deposit,
    }


def _base_query(db: Session):
    return (
        db.query(
            models.ContractRequest,
            models.Tenants.full_name,
            models.Contracts.room_id,
            models.Contracts.end_date,
            models.Contracts.security_deposit,
        )
        .join(
            models.Contracts,
            models.ContractRequest.contract_id == models.Contracts.contract_id,
        )
        .join(models.Tenants, models.Contracts.tenant_id == models.Tenants.tenant_id)
    )


def create_request(
    db: Session, data: schemas.ContractRequestCreate, created_by: int | None
) -> models.ContractRequest:
    req = models.ContractRequest(
        contract_id=data.contract_id,
        request_type=data.request_type,
        tenant_note=data.tenant_note,
        preferred_date=data.preferred_date,
        created_by=created_by,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def has_open_request(db: Session, contract_id: int) -> models.ContractRequest | None:
    return (
        db.query(models.ContractRequest)
        .filter(
            models.ContractRequest.contract_id == contract_id,
            models.ContractRequest.status.in_(_OPEN_STATUSES),
        )
        .first()
    )


def get_requests(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    tenant_id: int | None = None,
) -> list[dict]:
    query = _base_query(db)
    if status is not None:
        query = query.filter(models.ContractRequest.status == status)
    if tenant_id is not None:
        query = query.filter(models.Contracts.tenant_id == tenant_id)
    rows = (
        query.order_by(models.ContractRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        _row_to_dict(req, name, room, end, dep) for req, name, room, end, dep in rows
    ]


def get_request_row(db: Session, request_id: int) -> dict | None:
    row = (
        _base_query(db).filter(models.ContractRequest.request_id == request_id).first()
    )
    if row is None:
        return None
    req, name, room, end, dep = row
    return _row_to_dict(req, name, room, end, dep)


def get_request(db: Session, request_id: int) -> models.ContractRequest | None:
    return (
        db.query(models.ContractRequest)
        .filter(models.ContractRequest.request_id == request_id)
        .first()
    )


def _sum_checkout_damage(contract: models.Contracts) -> float:
    checkouts = [
        c
        for c in contract.contract_checklists
        if c.type == models.ChecklistType.check_out
    ]
    if not checkouts:
        raise ValueError("ต้องบันทึกผลตรวจสภาพห้องออกก่อน")
    latest = max(checkouts, key=lambda c: c.cc_id)
    items = latest.checklist_items or []
    return sum(float(it.get("cost") or 0) for it in items)


def update_request(
    db: Session, request_id: int, data: schemas.ContractRequestUpdate, handled_by: int
) -> models.ContractRequest | None:
    req = get_request(db, request_id)
    if req is None:
        return None

    changes = data.model_dump(exclude_unset=True)
    new_status = changes.get("status")

    if new_status is not None and new_status != req.status:
        if new_status not in _NEXT[req.status]:
            raise ValueError(
                f"เปลี่ยนสถานะจาก {req.status.value} เป็น {new_status.value} ไม่ได้"
            )

    contract = db.get(models.Contracts, req.contract_id)
    if contract is None:
        raise ValueError("ไม่พบสัญญาของคำขอนี้")

    # ปิดคำขอ → ลงมือกับสัญญาจริง
    if new_status == models.RequestStatus.completed and req.status != new_status:
        if req.request_type == models.RequestType.renew:
            new_end = changes.get("preferred_date") or req.preferred_date
            if new_end is None:
                raise ValueError("ต้องระบุวันสิ้นสุดใหม่")
            if new_end <= contract.end_date:
                raise ValueError("วันสิ้นสุดใหม่ต้องหลังวันสิ้นสุดเดิม")
            contract.end_date = new_end
        else:  # terminate
            damage = _sum_checkout_damage(contract)
            changes.setdefault("damage_total", damage)
            contract.status = models.ContractStatus.terminated

    for field, value in changes.items():
        setattr(req, field, value)

    # เปลี่ยนสถานะออกจาก pending → บันทึกผู้ดำเนินการล่าสุด + เวลา
    if new_status is not None and new_status != models.RequestStatus.pending:
        req.handled_by = handled_by
        req.handled_at = func.now()

    db.commit()
    db.refresh(req)
    return req


def delete_request(db: Session, request_id: int) -> models.ContractRequest | None:
    req = get_request(db, request_id)
    if req is None:
        return None
    db.delete(req)
    db.commit()
    return req


def latest_for_tenant(db: Session, tenant_id: int) -> models.ContractRequest | None:
    return (
        db.query(models.ContractRequest)
        .join(
            models.Contracts,
            models.ContractRequest.contract_id == models.Contracts.contract_id,
        )
        .filter(models.Contracts.tenant_id == tenant_id)
        .order_by(models.ContractRequest.created_at.desc())
        .first()
    )
