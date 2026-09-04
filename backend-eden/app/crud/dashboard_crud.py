import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import models


def counts(db: Session) -> dict:
    tenants = db.query(func.count(models.Tenants.tenant_id)).scalar() or 0
    active = (
        db.query(func.count(models.Contracts.contract_id))
        .filter(models.Contracts.status == "active")
        .scalar()
        or 0
    )
    draft = (
        db.query(func.count(models.Contracts.contract_id))
        .filter(models.Contracts.status == "draft")
        .scalar()
        or 0
    )
    requests_pending = (
        db.query(func.count(models.ContractRequest.request_id))
        .filter(models.ContractRequest.status == "pending")
        .scalar()
        or 0
    )
    return {
        "tenants": tenants,
        "contracts_active": active,
        "contracts_draft": draft,
        "requests_pending": requests_pending,
    }


def expiring_contracts(db: Session, days: int = 30) -> list[dict]:
    today = datetime.date.today()
    limit_date = today + datetime.timedelta(days=days)
    rows = (
        db.query(models.Contracts, models.Tenants.full_name)
        .join(models.Tenants, models.Contracts.tenant_id == models.Tenants.tenant_id)
        .filter(
            models.Contracts.status == "active",
            models.Contracts.end_date <= limit_date,
        )
        .order_by(models.Contracts.end_date.asc())
        .all()
    )
    return [
        {
            "contract_id": c.contract_id,
            "tenant_name": name,
            "room_id": c.room_id,
            "end_date": c.end_date,
            "days_left": (c.end_date - today).days,
        }
        for c, name in rows
    ]


def monthly_rent_total(db: Session) -> float:
    total = (
        db.query(func.coalesce(func.sum(models.Contracts.rent), 0))
        .filter(models.Contracts.status == "active")
        .scalar()
    )
    return float(total or 0)


def tenant_home(db: Session, user_id: int) -> dict:
    tenant = db.query(models.Tenants).filter(models.Tenants.user_id == user_id).first()
    if tenant is None:
        return {"tenant": None, "contract": None, "documents": [], "request": None}

    contract = (
        db.query(models.Contracts)
        .filter(models.Contracts.tenant_id == tenant.tenant_id)
        .order_by(models.Contracts.start_date.desc())
        .first()
    )
    documents = (
        db.query(models.TenantDocument)
        .filter(models.TenantDocument.tenant_id == tenant.tenant_id)
        .all()
    )
    request = (
        db.query(models.ContractRequest)
        .join(
            models.Contracts,
            models.ContractRequest.contract_id == models.Contracts.contract_id,
        )
        .filter(models.Contracts.tenant_id == tenant.tenant_id)
        .order_by(models.ContractRequest.created_at.desc())
        .first()
    )
    return {
        "tenant": tenant,
        "contract": contract,
        "documents": documents,
        "request": request,
    }
