import datetime

from pydantic import BaseModel

from ..models.models import (
    ChecklistType,
    ContractStatus,
    RateType,
    RequestStatus,
    RequestType,
    Role,
)


class User(BaseModel):
    username: str
    password: str
    role: Role


class UserOut(BaseModel):
    user_id: int
    username: str
    role: Role
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """PATCH /users/{id} — ส่งมาเฉพาะ field ที่อยากแก้"""
    username: str | None = None
    is_active: bool | None = None
    avatar_url: str | None = None


class PasswordSet(BaseModel):
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleUpdate(BaseModel):
    role: Role


class UserActiveUpdate(BaseModel):
    is_active: bool


class AuditLogOut(BaseModel):
    log_id: int
    action: str
    created_at: datetime.datetime
    user_id: int | None
    username: str | None


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


class ProfileTenantUpdate(BaseModel):
    """แก้ข้อมูลติดต่อของตัวเอง (ผู้เช่า) — ไม่มี field sensitive"""
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    current_address: str | None = None
    emergency_contact: str | None = None


class AvatarUpdate(BaseModel):
    avatar_url: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class TenantDocument(BaseModel):
    doc_type: str
    file_url: str


class DocumentCreate(BaseModel):
    doc_type: str
    file_url: str


class RoomOut(BaseModel):
    room_id: int          # = เลขห้อง
    floor: int
    base_rent: float
    status: str           # "available" | "occupied"
    contract_id: int | None = None   # สัญญาที่ผูกอยู่ (ถ้า occupied)


class ChecklistItem(BaseModel):
    name: str
    status: str = "ปกติ"
    note: str | None = None
    photos: list[str] = []
    cost: float = 0  # ค่าเสียหายรายรายการ (ใช้ตอนตรวจสภาพห้องออก)


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
    # สร้างพร้อมกันในทรานแซกชันเดียว (optional)
    checkin_items: list[ChecklistItem] = []
    tenant_signature: str | None = None
    documents: list[DocumentCreate] = []


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


class ChecklistCreate(BaseModel):
    type: ChecklistType = ChecklistType.check_in
    items: list[ChecklistItem] = []
    tenant_signature: str | None = None


class ChecklistUpdate(BaseModel):
    """สำหรับ PATCH — ส่งมาเฉพาะ field ที่อยากแก้"""
    type: ChecklistType | None = None
    items: list[ChecklistItem] | None = None
    tenant_signature: str | None = None


class ContractRequestCreate(BaseModel):
    contract_id: int
    request_type: RequestType
    tenant_note: str
    preferred_date: datetime.date | None = None


class ContractRequestUpdate(BaseModel):
    """สำหรับ PATCH — ส่งมาเฉพาะ field ที่อยากแก้"""
    status: RequestStatus | None = None
    staff_note: str | None = None
    preferred_date: datetime.date | None = None
    damage_total: float | None = None


class RateConfig(BaseModel):
    type: RateType
    rate_value: float
    effective_date: datetime.date


class RateConfigUpdate(BaseModel):
    type: RateType | None = None
    rate_value: float | None = None
    effective_date: datetime.date | None = None
