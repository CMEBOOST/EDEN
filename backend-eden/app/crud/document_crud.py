from sqlalchemy.orm import Session

from ..models import models
from ..schemas import schemas


def create_document(db: Session, tenant_id: int, data: schemas.DocumentCreate):
    new_doc = models.TenantDocument(
        tenant_id=tenant_id,
        doc_type=data.doc_type,
        file_url=data.file_url,
        uploaded_by=data.uploaded_by,
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc


def get_documents(db: Session, tenant_id: int):
    return (
        db.query(models.TenantDocument)
        .filter(models.TenantDocument.tenant_id == tenant_id)
        .all()
    )


def get_document(db: Session, doc_id: int):
    return (
        db.query(models.TenantDocument)
        .filter(models.TenantDocument.doc_id == doc_id)
        .first()
    )


def delete_document(db: Session, doc_id: int):
    doc = get_document(db, doc_id)
    if doc is None:
        return None
    db.delete(doc)
    db.commit()
    return doc
