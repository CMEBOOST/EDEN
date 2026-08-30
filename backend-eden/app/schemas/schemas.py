import datetime
from typing import Any

from pydantic import BaseModel

from ..models.models import ChecklistType, ContractStatus, RateType, Role


class User(BaseModel):
    username: str
    password: str
    role: Role


class Tenants(BaseModel):
    full_name: str
    phone: str
    email: str
    current_address: str | None = None
    national_id_encrypted: str | None = None
    emergency_contact: str | None = None


class TenantDocument(BaseModel):
    doc_type: str
    file_url: str


class Contracts(BaseModel):
    tenant_id: int
    room_id: int | None = None
    start_date: datetime.date
    end_date: datetime.date
    rent: float
    security_deposit: float
    contract_file_url: str | None = None
    special_conditions: str | None = None
    status: ContractStatus = ContractStatus.draft


class ContractChecklist(BaseModel):
    contract_id: int
    type: ChecklistType
    checklist_items: Any | None = None
    tenant_signature: str | None = None
    photo_urls: Any | None = None


class RateConfig(BaseModel):
    type: RateType
    rate_value: float
    effective_date: datetime.date
