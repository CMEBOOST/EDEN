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
