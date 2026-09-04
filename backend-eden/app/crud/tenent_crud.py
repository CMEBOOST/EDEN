from sqlalchemy.orm import Session

from ..models import models
from ..schemas import schemas


def create_tenant(db: Session, tenant: schemas.Tenants):
    new_tenant = models.Tenants(
        user_id=tenant.user_id,
        full_name=tenant.full_name,
        phone=tenant.phone,
        email=tenant.email,
        current_address=tenant.current_address,
        national_id_encrypted=tenant.national_id_encrypted,
        emergency_contact=tenant.emergency_contact,
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant


def get_tenants(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.Tenants).offset(skip).limit(limit).all()


def get_tenant(db: Session, tenant_id: int):
    return (
        db.query(models.Tenants).filter(models.Tenants.tenant_id == tenant_id).first()
    )


def get_tenant_by_user(db: Session, user_id: int):
    return db.query(models.Tenants).filter(models.Tenants.user_id == user_id).first()


def update_tenant(db: Session, tenant_id: int, fields: dict):
    tenant = get_tenant(db, tenant_id)
    if tenant is None:
        return None

    for field, value in fields.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)
    return tenant


def delete_tenant(db: Session, tenant_id: int):
    tenant = get_tenant(db, tenant_id)
    if tenant is None:
        return None

    db.delete(tenant)
    db.commit()
    return tenant
