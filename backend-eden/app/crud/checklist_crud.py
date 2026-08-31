from sqlalchemy.orm import Session

from ..models import models
from ..schemas import schemas


def create_checklist(db: Session, contract_id: int, data: schemas.ChecklistCreate):
    items = [item.model_dump() for item in data.items]
    photo_urls = [url for item in data.items for url in item.photos]

    new_checklist = models.ContractChecklist(
        contract_id=contract_id,
        type=data.type,
        checklist_items=items,
        photo_urls=photo_urls,
        tenant_signature=data.tenant_signature,
        created_by=data.created_by,
    )
    db.add(new_checklist)
    db.commit()
    db.refresh(new_checklist)
    return new_checklist


def get_checklists(db: Session, contract_id: int):
    return (
        db.query(models.ContractChecklist)
        .filter(models.ContractChecklist.contract_id == contract_id)
        .all()
    )


def get_checklist(db: Session, cc_id: int):
    return (
        db.query(models.ContractChecklist)
        .filter(models.ContractChecklist.cc_id == cc_id)
        .first()
    )


def update_checklist(db: Session, cc_id: int, data: schemas.ChecklistUpdate):
    checklist = get_checklist(db, cc_id)
    if checklist is None:
        return None

    if data.type is not None:
        checklist.type = data.type
    if data.tenant_signature is not None:
        checklist.tenant_signature = data.tenant_signature
    if data.items is not None:
        checklist.checklist_items = [item.model_dump() for item in data.items]
        checklist.photo_urls = [url for item in data.items for url in item.photos]

    db.commit()
    db.refresh(checklist)
    return checklist


def delete_checklist(db: Session, cc_id: int):
    checklist = get_checklist(db, cc_id)
    if checklist is None:
        return None
    db.delete(checklist)
    db.commit()
    return checklist
