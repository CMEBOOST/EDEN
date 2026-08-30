import datetime
import enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)

from ..database import Base

# เก็บเวลาเต็ม (UTC + timezone) — การจัดรูปแบบให้อ่านง่ายทำที่ฝั่งแสดงผล
Timestamp = DateTime(timezone=True)


def _enum_col(python_enum, name):
    """Enum column ที่เก็บ "value" ของ Enum ลง DB (ไม่ใช่ชื่อ member)."""
    return SAEnum(
        python_enum,
        name=name,
        values_callable=lambda e: [member.value for member in e],
    )


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class Role(str, enum.Enum):
    admin = "admin"
    staff = "staff"
    tenant = "tenant"


class ContractStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    expired = "expired"
    terminated = "terminated"


class ChecklistType(str, enum.Enum):
    check_in = "check-in"
    check_out = "check-out"


class RateType(str, enum.Enum):
    water = "water"
    electric = "electric"


class RequestType(str, enum.Enum):
    renew = "renew"
    terminate = "terminate"


class RequestStatus(str, enum.Enum):
    pending = "pending"      # ผู้เช่าแจ้ง ยังไม่มีใครรับเรื่อง
    accepted = "accepted"    # staff/admin รับเรื่อง กำลังดำเนินการ
    rejected = "rejected"
    completed = "completed"  # ต่อสัญญาแล้ว / ตรวจสภาพห้องออกเสร็จ


# ---------------------------------------------------------------------------
# Mixin: created_at / updated_at ให้ทุกตารางเหมือนกัน
# ---------------------------------------------------------------------------
class TimestampMixin:
    created_at: Mapped[datetime.datetime] = mapped_column(
        Timestamp, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        Timestamp,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class Users(TimestampMixin, Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(_enum_col(Role, "role_enum"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    # ความสัมพันธ์
    tenants: Mapped[list["Tenants"]] = relationship(back_populates="user")
    rate_configs: Mapped[list["RateConfig"]] = relationship(back_populates="created_by_user")
    contracts_created: Mapped[list["Contracts"]] = relationship(back_populates="created_by_user")
    documents_uploaded: Mapped[list["TenantDocument"]] = relationship(back_populates="uploaded_by_user")
    checklists_created: Mapped[list["ContractChecklist"]] = relationship(back_populates="created_by_user")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")


# ---------------------------------------------------------------------------
# Tenants
# ---------------------------------------------------------------------------
class Tenants(TimestampMixin, Base):
    __tablename__ = "tenants"

    tenant_id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    user: Mapped["Users"] = relationship(back_populates="tenants")

    full_name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(255))
    current_address: Mapped[str | None] = mapped_column(Text)
    national_id_encrypted: Mapped[str | None] = mapped_column(String(255))
    emergency_contact: Mapped[str | None] = mapped_column(String(255))
    last_login_at: Mapped[datetime.datetime | None] = mapped_column(Timestamp)

    tenant_documents: Mapped[list["TenantDocument"]] = relationship(back_populates="tenant")
    contracts: Mapped[list["Contracts"]] = relationship(back_populates="tenant")


# ---------------------------------------------------------------------------
# Tenant documents
# ---------------------------------------------------------------------------
class TenantDocument(TimestampMixin, Base):
    __tablename__ = "tenant_documents"

    doc_id: Mapped[int] = mapped_column(primary_key=True, index=True)

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.tenant_id"), index=True)
    tenant: Mapped["Tenants"] = relationship(back_populates="tenant_documents")

    doc_type: Mapped[str] = mapped_column(String(50))
    file_url: Mapped[str] = mapped_column(String(500))

    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    uploaded_by_user: Mapped["Users | None"] = relationship(back_populates="documents_uploaded")


# ---------------------------------------------------------------------------
# Contracts
# ---------------------------------------------------------------------------
class Contracts(TimestampMixin, Base):
    __tablename__ = "contracts"

    contract_id: Mapped[int] = mapped_column(primary_key=True, index=True)

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.tenant_id"), index=True)
    tenant: Mapped["Tenants"] = relationship(back_populates="contracts")

    # room_id ยังเป็น Demo (ยังไม่มีตาราง rooms) — เก็บไว้ก่อนแบบ nullable
    room_id: Mapped[int | None] = mapped_column(index=True)

    start_date: Mapped[datetime.date] = mapped_column(Date)
    end_date: Mapped[datetime.date] = mapped_column(Date)
    rent: Mapped[float] = mapped_column(Numeric(10, 2))
    security_deposit: Mapped[float] = mapped_column(Numeric(10, 2))
    contract_file_url: Mapped[str | None] = mapped_column(String(500))
    special_conditions: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ContractStatus] = mapped_column(
        _enum_col(ContractStatus, "contract_status_enum"),
        default=ContractStatus.draft,
    )

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    created_by_user: Mapped["Users | None"] = relationship(back_populates="contracts_created")

    contract_checklists: Mapped[list["ContractChecklist"]] = relationship(back_populates="contract")
    contract_requests: Mapped[list["ContractRequest"]] = relationship(back_populates="contract")


# ---------------------------------------------------------------------------
# Contract checklists
# ---------------------------------------------------------------------------
class ContractChecklist(TimestampMixin, Base):
    __tablename__ = "contract_checklists"

    cc_id: Mapped[int] = mapped_column(primary_key=True, index=True)

    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.contract_id"), index=True)
    contract: Mapped["Contracts"] = relationship(back_populates="contract_checklists")

    type: Mapped[ChecklistType] = mapped_column(_enum_col(ChecklistType, "checklist_type_enum"))
    checklist_items: Mapped[dict | list | None] = mapped_column(JSON)
    tenant_signature: Mapped[str | None] = mapped_column(String(500))
    photo_urls: Mapped[dict | list | None] = mapped_column(JSON)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    created_by_user: Mapped["Users | None"] = relationship(back_populates="checklists_created")


# ---------------------------------------------------------------------------
# Contract requests — คำแจ้งความจำนงล่วงหน้า (ต่อสัญญา / ยุติสัญญา)
# ---------------------------------------------------------------------------
class ContractRequest(TimestampMixin, Base):
    __tablename__ = "contract_requests"

    request_id: Mapped[int] = mapped_column(primary_key=True, index=True)

    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.contract_id"), index=True)
    contract: Mapped["Contracts"] = relationship(back_populates="contract_requests")

    request_type: Mapped[RequestType] = mapped_column(_enum_col(RequestType, "request_type_enum"))
    status: Mapped[RequestStatus] = mapped_column(
        _enum_col(RequestStatus, "request_status_enum"),
        default=RequestStatus.pending,
    )

    tenant_note: Mapped[str] = mapped_column(Text)
    # วันสิ้นสุดใหม่ (ต่อสัญญา) หรือ วันย้ายออกที่เสนอ (ยุติสัญญา)
    preferred_date: Mapped[datetime.date | None] = mapped_column(Date)
    staff_note: Mapped[str | None] = mapped_column(Text)
    damage_total: Mapped[float | None] = mapped_column(Numeric(10, 2))

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    handled_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    handled_at: Mapped[datetime.datetime | None] = mapped_column(Timestamp)

    created_by_user: Mapped["Users | None"] = relationship(foreign_keys=[created_by])
    handled_by_user: Mapped["Users | None"] = relationship(foreign_keys=[handled_by])


# ---------------------------------------------------------------------------
# Rate configs
# ---------------------------------------------------------------------------
class RateConfig(TimestampMixin, Base):
    __tablename__ = "rate_configs"
    # 1 อัตราต่อ 1 ประเภท ต่อ 1 วันมีผล — กันตั้งซ้อนวันเดียวกัน
    __table_args__ = (
        UniqueConstraint("type", "effective_date", name="uq_rate_type_date"),
    )

    rate_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    type: Mapped[RateType] = mapped_column(_enum_col(RateType, "rate_type_enum"))
    rate_value: Mapped[float] = mapped_column(Numeric(10, 2))
    effective_date: Mapped[datetime.date] = mapped_column(Date)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    created_by_user: Mapped["Users | None"] = relationship(back_populates="rate_configs")


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), index=True)
    user: Mapped["Users | None"] = relationship(back_populates="audit_logs")

    action: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime.datetime] = mapped_column(
        Timestamp, server_default=func.now(), nullable=False
    )
