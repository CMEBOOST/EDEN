import datetime
from enum import Enum

from pydantic import BaseModel


class Role(str, Enum):
    admin = "admin"
    staff = "staff"
    tenant = "tenant"

class Status(str, Enum):
    draft = "draft"
    active = 'active'
    expired = 'expired'
    terminated = 'terminated'

class Type_(str, Enum):
    water = 'water'
    electric = 'electric'

class User(BaseModel):
    username: str
    password: str
    role: Role
    
class Tenants(BaseModel):
    full_name :str
    phone : str
    email : str
    current_address : str
    national_id : str
    emergency_contact : str
    
class Tenant_documents(BaseModel):
    
    doc_type : str
    file_url : str
    
class Contracts(BaseModel):
    start_date : datetime.date
    end_date : datetime.date
    rent : float
    security_deposit : float
    special_conditions : str
    status : Status

class Contract_checklist(BaseModel):
    status : str
    checklist_items : str
    tenant_signature : str
    created_at : datetime.date
    update_at : datetime.date
    
class Rate_config(BaseModel):
    type_ : Type_
    effective_date : datetime.date