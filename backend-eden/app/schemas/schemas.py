import datetime

from pydantic import BaseModel

from ..models.models import ChecklistType, ContractStatus, RateType, Role


class User(BaseModel):
    username: str
    password: str
    role: Role


class Tenants(BaseModel):
    user_id: int
    full_name: str
    phone: str
    email: str
    current_address: str | None = None
    national_id_encrypted: str | None = None
    emergency_contact: str | None = None


class TenantUpdate(BaseModel):
    """สำหรับ PATCH/PUT — ส่งมาเฉพาะ field ที่อยากแก้"""
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    current_address: str | None = None
    national_id_encrypted: str | None = None
    emergency_contact: str | None = None


class TenantDocument(BaseModel):
    doc_type: str
    file_url: str


class DocumentCreate(BaseModel):
    doc_type: str
    file_url: str
    uploaded_by: int | None = None


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
    created_by: int | None = None


class ContractUpdate(BaseModel):
    """สำหรับ PUT — ส่งมาเฉพาะ field ที่อยากแก้"""
    room_id: int | None = None
    start_date: datetime.date | None = None
    end_date: datetime.date | None = None
    rent: float | None = None
    security_deposit: float | None = None
    contract_file_url: str | None = None
    special_conditions: str | None = None
    status: ContractStatus | None = None


class ChecklistItem(BaseModel):
    name: str
    status: str = "ปกติ"
    note: str | None = None
    photos: list[str] = []


class ChecklistCreate(BaseModel):
    type: ChecklistType = ChecklistType.check_in
    items: list[ChecklistItem] = []
    tenant_signature: str | None = None
    created_by: int | None = None


class RateConfig(BaseModel):
    type: RateType
    rate_value: float
    effective_date: datetime.date
    created_by: int | None = None


class RateConfigUpdate(BaseModel):
    type: RateType | None = None
    rate_value: float | None = None
    effective_date: datetime.date | None = None
