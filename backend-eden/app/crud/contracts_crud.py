import datetime

from sqlalchemy.orm import Session

from ..models import models
from ..schemas import schemas


def create_contract(
    db: Session,
    contract: schemas.Contracts,
    created_by: int | None = None,
    commit: bool = True,
):
    new_contract = models.Contracts(
        tenant_id=contract.tenant_id,
        room_id=contract.room_id,
        start_date=contract.start_date,
        end_date=contract.end_date,
        rent=contract.rent,
        security_deposit=contract.security_deposit,
        contract_file_url=contract.contract_file_url,
        special_conditions=contract.special_conditions,
        status=contract.status,
        created_by=created_by,
    )
    db.add(new_contract)
    if commit:
        db.commit()
        db.refresh(new_contract)
    else:
        db.flush()
    return new_contract


def get_contracts(
    db: Session,
    skip: int = 0,
    limit: int = 10,
    tenant_id: int | None = None,
    finished: bool | None = None,
):
    query = db.query(models.Contracts)
    if tenant_id is not None:
        query = query.filter(models.Contracts.tenant_id == tenant_id)

    if finished is not None:
        # "เสร็จสิ้น" = สัญญาจบ lifecycle แล้ว (หมดอายุ / ยกเลิก)
        done = (models.ContractStatus.expired, models.ContractStatus.terminated)
        query = query.filter(
            models.Contracts.status.in_(done)
            if finished
            else models.Contracts.status.notin_(done)
        )

    return query.offset(skip).limit(limit).all()


def get_contract(db: Session, contract_id: int):
    return (
        db.query(models.Contracts)
        .filter(models.Contracts.contract_id == contract_id)
        .first()
    )


def update_contract(db: Session, contract_id: int, data: schemas.ContractUpdate):
    contract = get_contract(db, contract_id)
    if contract is None:
        return None

    # อัปเดตเฉพาะ field ที่ส่งมา
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)

    db.commit()
    db.refresh(contract)
    return contract


def delete_contract(db: Session, contract_id: int):
    contract = get_contract(db, contract_id)
    if contract is None:
        return None

    db.delete(contract)
    db.commit()
    return contract


def expire_overdue(db: Session) -> int:
    """ตั้งสัญญา active ที่เลย end_date เป็น expired · คืนจำนวนที่เปลี่ยน"""
    n = (
        db.query(models.Contracts)
        .filter(
            models.Contracts.status == models.ContractStatus.active,
            models.Contracts.end_date < datetime.date.today(),
        )
        .update({"status": models.ContractStatus.expired}, synchronize_session=False)
    )
    db.commit()
    return n
