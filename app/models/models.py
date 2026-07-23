import datetime

from ..database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey


class Users(Base):
    __tablename__ = "users"
    user_id : Mapped[int] = mapped_column(primary_key=True, index=True)
    username : Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password : Mapped[str] = mapped_column()
    role : Mapped[str] = mapped_column()
    
    # 1. User เชื่อมไป Tenant
    tenants : Mapped[list["Tenants"]] = relationship(back_populates='user')
    
    # เชื่อมไป rate_configs
    rate_configs : Mapped[list["Rate_config"]] = relationship(back_populates='user')
    
    
class Tenants(Base):
    __tablename__ = "tenants"
    tenant_id : Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # --- ส่วนที่เชื่อมกับ User
    user_id : Mapped[int] = mapped_column(ForeignKey('users.user_id'),index=True)
    user : Mapped["Users"] = relationship(back_populates='tenants')
    
    # --- ส่วนที่เชื่อมกับ เอกสาร (TenantDocument)
    tenant_documents : Mapped[list["Tenant_documents"]] = relationship(back_populates='tenant')
    
    full_name : Mapped[str] = mapped_column()
    phone : Mapped[str] = mapped_column()
    email : Mapped[str] = mapped_column()
    current_address : Mapped[str] = mapped_column()
    national_id : Mapped[str] = mapped_column()
    emergency_contact : Mapped[str] = mapped_column()
    
    # --- ส่วนที่เชื่อมกับ contracts
    contract : Mapped[list['Contracts']] = relationship(back_populates='tenant')
    

class Tenant_documents(Base):
    __tablename__ = "tenant_documents"
    tenant_document_id : Mapped[int] = mapped_column(primary_key=True, index=True)
    
    doc_type : Mapped[str] = mapped_column()
    file_url : Mapped[str] = mapped_column()
    
    # --- ส่วนที่เชื่อมกลับไปหา Tenant ---
    tenant_id : Mapped[int] = mapped_column(ForeignKey('tenants.tenant_id'),index=True)
    tenant : Mapped["Tenants"] = relationship(back_populates='tenant_documents')
    
class Contracts(Base):
    __tablename__ = "contracts"
    contracts_id : Mapped[int] = mapped_column(primary_key=True, index=True)
    
    #-- เชื่อมไป tenant_id
    tenant_id : Mapped[int] = mapped_column(ForeignKey('tenants.tenant_id'), index=True)
    tenant : Mapped["Tenants"] = relationship(back_populates='contract')
    #-- เชื่อมไป room_id ตัวนี้ยังเป็น Demo (ไม่ทำ)
    
    start_date : Mapped[datetime.date] = mapped_column()
    end_date : Mapped[datetime.date] = mapped_column()
    rent : Mapped[float] = mapped_column()
    security_deposit : Mapped[float] = mapped_column()
    special_conditions : Mapped[str] = mapped_column()
    status : Mapped[str] = mapped_column()
    
    #-- รับ contract_checklist
    contract_checklist : Mapped[list['Contract_checklist']] = relationship(back_populates='contract')

class Contract_checklist(Base):
    __tablename__ = 'contract_checklist'
    cc_id : Mapped[int] = mapped_column(primary_key=True, index=True)
    status : Mapped[str] = mapped_column()
    checklist_items : Mapped[str] = mapped_column()
    tenant_signature : Mapped[str] = mapped_column()
    created_at : Mapped[datetime.date] = mapped_column()
    update_at : Mapped[datetime.date] = mapped_column()
    
    #-- เชื่อม FK ไปยัง Contract
    
    contracts_id : Mapped[int] = mapped_column(ForeignKey("contracts.contracts_id"),index=True)
    contract : Mapped['Contracts'] = relationship(back_populates="contract_checklist")
    
class Rate_config(Base):
    __tablename__ = 'rateConfig'
    rate_id : Mapped[int] = mapped_column(primary_key=True, index=True)
    type_ : Mapped[str] = mapped_column()
    effective_date : Mapped[datetime.date] = mapped_column()
    
    # FK สร้างโดย User ไหน
    user_id : Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    
    user : Mapped["Users"] = relationship(back_populates='rate_configs')