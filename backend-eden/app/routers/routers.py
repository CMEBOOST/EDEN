import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.auth import (
    create_access_token,
    get_current_user,
    require_admin,
    require_staff,
)
from ..core.security import verify_password
from ..core.storage import save_upload
from ..crud import (
    audit_crud,
    checklist_crud,
    contracts_crud,
    dashboard_crud,
    document_crud,
    rate_crud,
    request_crud,
    tenent_crud,
    user_crud,
)
from ..database import get_db
from ..models import models
from ..models.models import ChecklistType, ContractStatus, RateType, RequestStatus
from ..schemas import schemas

# ทุก router (ยกเว้น auth) ต้องล็อกอินก่อน · write = staff+ · ตั้งค่าระบบ = admin
_auth = [Depends(get_current_user)]
_staff = [Depends(require_staff)]
_admin = [Depends(require_admin)]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
auth_router = APIRouter(prefix="/auth", tags=["Auth"])


@auth_router.post("/login", response_model=schemas.Token)
def login_route(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = user_crud.get_user_by_username(db, form.username)
    if user is None or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=401, detail="username หรือรหัสผ่านไม่ถูกต้อง"
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="บัญชีนี้ถูกปิดการใช้งาน")
    audit_crud.write(db, user.user_id, "เข้าสู่ระบบ")
    return schemas.Token(access_token=create_access_token(user.username))


@auth_router.get("/me", response_model=schemas.UserOut)
def me_route(user: models.Users = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Users (จัดการสิทธิ์)
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=schemas.UserOut, dependencies=[Depends(require_admin)])
def create_user_route(user: schemas.User, db: Session = Depends(get_db)):
    if user_crud.get_user_by_username(db, user.username) is not None:
        raise HTTPException(status_code=409, detail="username นี้มีอยู่แล้ว")
    return user_crud.create_user(db=db, user=user)


@router.get(
    "/", response_model=list[schemas.UserOut], dependencies=[Depends(require_staff)]
)
def get_users_route(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return user_crud.get_user(db=db, skip=skip, limit=limit)


@router.get(
    "/{user_id}", response_model=schemas.UserOut, dependencies=[Depends(require_staff)]
)
def get_user_route(user_id: int, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    return user


@router.patch("/{user_id}/role", response_model=schemas.UserOut)
def update_role_route(
    user_id: int,
    data: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_admin),
):
    if user_id == me.user_id:
        raise HTTPException(status_code=400, detail="เปลี่ยน role ของตัวเองไม่ได้")
    user = user_crud.set_role(db, user_id, data.role)
    if user is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    return user


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_active_route(
    user_id: int,
    data: schemas.UserActiveUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_admin),
):
    if user_id == me.user_id:
        raise HTTPException(
            status_code=400, detail="เปิด/ปิดการใช้งานบัญชีตัวเองไม่ได้"
        )
    user = user_crud.set_active(db, user_id, data.is_active)
    if user is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    return user


# ---------------------------------------------------------------------------
# Uploads — static mount อยู่ที่ /uploads แล้ว จึงใช้ /upload สำหรับ POST
# ---------------------------------------------------------------------------
upload_router = APIRouter(prefix="/upload", tags=["Uploads"], dependencies=_staff)


@upload_router.post("/")
def upload_file_route(file: UploadFile = File(...)):
    return {"url": save_upload(file), "filename": file.filename}


# ---------------------------------------------------------------------------
# Tenants
# ---------------------------------------------------------------------------
tenant_router = APIRouter(prefix="/tenants", tags=["Tenants"], dependencies=_staff)


@tenant_router.post("/", dependencies=_staff)
def create_tenant_route(tenant: schemas.Tenants, db: Session = Depends(get_db)):
    if user_crud.get_user_by_id(db=db, user_id=tenant.user_id) is None:
        raise HTTPException(status_code=400, detail="ไม่พบ user_id นี้")
    return tenent_crud.create_tenant(db=db, tenant=tenant)


@tenant_router.get("/")
def list_tenants_route(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return tenent_crud.get_tenants(db=db, skip=skip, limit=limit)


@tenant_router.get("/{tenant_id}")
def get_tenant_route(tenant_id: int, db: Session = Depends(get_db)):
    tenant = tenent_crud.get_tenant(db=db, tenant_id=tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return tenant


@tenant_router.put("/{tenant_id}", dependencies=_staff)
def update_tenant_route(
    tenant_id: int, data: schemas.TenantUpdate, db: Session = Depends(get_db)
):
    tenant = tenent_crud.update_tenant(db=db, tenant_id=tenant_id, data=data)
    if tenant is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return tenant


@tenant_router.delete("/{tenant_id}", dependencies=_admin)
def delete_tenant_route(tenant_id: int, db: Session = Depends(get_db)):
    """soft delete — ปิดการใช้งาน user ที่ผูกกับผู้เช่า (ไม่ลบข้อมูลจริง)"""
    tenant = tenent_crud.get_tenant(db=db, tenant_id=tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    user_crud.set_active(db, tenant.user_id, False)
    return {"ok": True}


# --- เอกสารของผู้เช่า ---
@tenant_router.post("/{tenant_id}/documents", dependencies=_staff)
def create_document_route(
    tenant_id: int, data: schemas.DocumentCreate, db: Session = Depends(get_db)
):
    if tenent_crud.get_tenant(db=db, tenant_id=tenant_id) is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return document_crud.create_document(db=db, tenant_id=tenant_id, data=data)


@tenant_router.get("/{tenant_id}/documents")
def list_documents_route(tenant_id: int, db: Session = Depends(get_db)):
    return document_crud.get_documents(db=db, tenant_id=tenant_id)


# path ไม่ขึ้นกับ tenant → แยก router
document_router = APIRouter(prefix="/documents", tags=["Documents"], dependencies=_auth)


@document_router.delete("/{doc_id}", dependencies=_staff)
def delete_document_route(doc_id: int, db: Session = Depends(get_db)):
    doc = document_crud.delete_document(db=db, doc_id=doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    return {"delete": "ok"}


# ---------------------------------------------------------------------------
# Contracts
# ---------------------------------------------------------------------------
contract_router = APIRouter(prefix="/contracts", tags=["Contracts"], dependencies=_staff)


@contract_router.post("/", dependencies=_staff)
def create_contract_route(contract: schemas.Contracts, db: Session = Depends(get_db)):
    if tenent_crud.get_tenant(db=db, tenant_id=contract.tenant_id) is None:
        raise HTTPException(status_code=400, detail="ไม่พบ tenant_id นี้")
    if (
        contract.created_by is not None
        and user_crud.get_user_by_id(db=db, user_id=contract.created_by) is None
    ):
        raise HTTPException(status_code=400, detail="ไม่พบ created_by (user_id) นี้")
    if contract.end_date < contract.start_date:
        raise HTTPException(status_code=400, detail="end_date ต้องไม่ก่อน start_date")
    return contracts_crud.create_contract(db=db, contract=contract)


@contract_router.get("/")
def list_contracts_route(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int | None = None,
    db: Session = Depends(get_db),
):
    return contracts_crud.get_contracts(
        db=db, skip=skip, limit=limit, tenant_id=tenant_id
    )


@contract_router.get("/{contract_id}")
def get_contract_route(contract_id: int, db: Session = Depends(get_db)):
    contract = contracts_crud.get_contract(db=db, contract_id=contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return contract


@contract_router.put("/{contract_id}")
def update_contract_route(
    contract_id: int,
    data: schemas.ContractUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_staff),
):
    # ยุติสัญญา (terminated) = เฉพาะ admin (UC3.5)
    if data.status == ContractStatus.terminated and me.role != models.Role.admin:
        raise HTTPException(status_code=403, detail="เฉพาะผู้ดูแลระบบยุติสัญญาได้")
    contract = contracts_crud.update_contract(db=db, contract_id=contract_id, data=data)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return contract


@contract_router.delete("/{contract_id}", dependencies=_admin)
def delete_contract_route(contract_id: int, db: Session = Depends(get_db)):
    contract = contracts_crud.delete_contract(db=db, contract_id=contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return {"delete": "ok"}


# --- checklist สภาพห้อง ---
@contract_router.post("/{contract_id}/checklists", dependencies=_staff)
def create_checklist_route(
    contract_id: int, data: schemas.ChecklistCreate, db: Session = Depends(get_db)
):
    if contracts_crud.get_contract(db=db, contract_id=contract_id) is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return checklist_crud.create_checklist(db=db, contract_id=contract_id, data=data)


@contract_router.get("/{contract_id}/checklists")
def list_checklists_route(contract_id: int, db: Session = Depends(get_db)):
    return checklist_crud.get_checklists(db=db, contract_id=contract_id)


# ---------------------------------------------------------------------------
# Rate configs (อัตราค่าน้ำ / ค่าไฟ)
# ---------------------------------------------------------------------------
rate_router = APIRouter(prefix="/rates", tags=["Rates"], dependencies=_auth)


@rate_router.post("/", dependencies=_admin)
def create_rate_route(rate: schemas.RateConfig, db: Session = Depends(get_db)):
    dup = rate_crud.rate_exists(db, rate.type, rate.effective_date)
    if dup is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"มีอัตรา {rate.type.value} สำหรับวันที่ {rate.effective_date} อยู่แล้ว",
                "existing_rate_id": dup.rate_id,
            },
        )
    return rate_crud.create_rate(db=db, rate=rate)


@rate_router.get("/", dependencies=_staff)
def list_rates_route(type: str | None = None, db: Session = Depends(get_db)):
    return rate_crud.get_rates(db=db, type_=type)


@rate_router.get("/current")
def current_rates_route(
    date: datetime.date | None = None, db: Session = Depends(get_db)
):
    """อัตราที่มีผล ณ วันที่ที่ระบุ (ไม่ระบุ = วันนี้) แยกตามประเภท"""
    on_date = date or datetime.date.today()
    return {
        t.value: rate_crud.get_effective_rate(db, t.value, on_date)
        for t in RateType
    }


@rate_router.get("/{rate_id}")
def get_rate_route(rate_id: int, db: Session = Depends(get_db)):
    rate = rate_crud.get_rate(db=db, rate_id=rate_id)
    if rate is None:
        raise HTTPException(status_code=404, detail="ไม่พบอัตราค่าบริการ")
    return rate


@rate_router.put("/{rate_id}", dependencies=_admin)
def update_rate_route(
    rate_id: int, data: schemas.RateConfigUpdate, db: Session = Depends(get_db)
):
    current = rate_crud.get_rate(db=db, rate_id=rate_id)
    if current is None:
        raise HTTPException(status_code=404, detail="ไม่พบอัตราค่าบริการ")

    new_type = data.type or current.type
    new_date = data.effective_date or current.effective_date
    dup = rate_crud.rate_exists(db, new_type, new_date)
    if dup is not None and dup.rate_id != rate_id:
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"มีอัตรา {new_type.value} สำหรับวันที่ {new_date} อยู่แล้ว",
                "existing_rate_id": dup.rate_id,
            },
        )
    return rate_crud.update_rate(db=db, rate_id=rate_id, data=data)


@rate_router.delete("/{rate_id}", dependencies=_admin)
def delete_rate_route(rate_id: int, db: Session = Depends(get_db)):
    rate = rate_crud.delete_rate(db=db, rate_id=rate_id)
    if rate is None:
        raise HTTPException(status_code=404, detail="ไม่พบอัตราค่าบริการ")
    return {"delete": "ok"}


# ---------------------------------------------------------------------------
# Audit logs (เฉพาะ admin)
# ---------------------------------------------------------------------------
audit_router = APIRouter(
    prefix="/audit-logs", tags=["Audit"], dependencies=[Depends(require_admin)]
)


@audit_router.get("/", response_model=list[schemas.AuditLogOut])
def list_audit_logs_route(
    skip: int = 0,
    limit: int = 50,
    user_id: int | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    return audit_crud.get_logs(db, skip=skip, limit=limit, user_id=user_id, q=q)


# ---------------------------------------------------------------------------
# Contract requests — คำแจ้งความจำนงล่วงหน้า (ต่อสัญญา / ยุติสัญญา)
# ---------------------------------------------------------------------------
request_router = APIRouter(
    prefix="/contract-requests", tags=["Contract Requests"], dependencies=_auth
)


def _role(user: models.Users) -> str:
    return user.role.value if hasattr(user.role, "value") else user.role


@request_router.post("/")
def create_request_route(
    data: schemas.ContractRequestCreate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    contract = contracts_crud.get_contract(db=db, contract_id=data.contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")

    if _role(me) == "tenant":
        tenant = tenent_crud.get_tenant_by_user(db=db, user_id=me.user_id)
        if tenant is None or contract.tenant_id != tenant.tenant_id:
            raise HTTPException(
                status_code=403, detail="แจ้งความจำนงได้เฉพาะสัญญาของตัวเอง"
            )

    if request_crud.has_open_request(db=db, contract_id=data.contract_id) is not None:
        raise HTTPException(
            status_code=409, detail="มีคำแจ้งความจำนงที่ยังไม่ดำเนินการอยู่แล้ว"
        )

    return request_crud.create_request(db=db, data=data, created_by=me.user_id)


@request_router.get("/")
def list_requests_route(
    status: str | None = None,
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    if _role(me) == "tenant":
        tenant = tenent_crud.get_tenant_by_user(db=db, user_id=me.user_id)
        if tenant is None:
            return []
        return request_crud.get_requests(
            db=db, status=status, tenant_id=tenant.tenant_id
        )
    return request_crud.get_requests(db=db, status=status)


@request_router.get("/{request_id}")
def get_request_route(
    request_id: int,
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    row = request_crud.get_request_row(db=db, request_id=request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="ไม่พบคำแจ้งความจำนง")

    if _role(me) == "tenant":
        tenant = tenent_crud.get_tenant_by_user(db=db, user_id=me.user_id)
        contract = contracts_crud.get_contract(db=db, contract_id=row["contract_id"])
        if tenant is None or contract is None or contract.tenant_id != tenant.tenant_id:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ดูคำขอนี้")

    return row


@request_router.patch("/{request_id}", dependencies=_staff)
def update_request_route(
    request_id: int,
    data: schemas.ContractRequestUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_staff),
):
    req = request_crud.get_request(db=db, request_id=request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="ไม่พบคำแจ้งความจำนง")

    # ปิดงานยุติสัญญา ต้องบันทึกผลตรวจสภาพห้องออกก่อน
    if (
        data.status == RequestStatus.completed
        and req.request_type == models.RequestType.terminate
    ):
        checklists = checklist_crud.get_checklists(db=db, contract_id=req.contract_id)
        if not any(c.type == ChecklistType.check_out for c in checklists):
            raise HTTPException(
                status_code=400, detail="ต้องบันทึกผลตรวจสภาพห้องออกก่อน"
            )

    return request_crud.update_request(
        db=db, request_id=request_id, data=data, handled_by=me.user_id
    )


# ---------------------------------------------------------------------------
# Dashboard (แตกข้อมูลตาม role)
# ---------------------------------------------------------------------------
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=_auth)


@dashboard_router.get("/")
def dashboard_route(
    db: Session = Depends(get_db), me: models.Users = Depends(get_current_user)
):
    role = me.role.value if hasattr(me.role, "value") else me.role

    if role == "tenant":
        home = dashboard_crud.tenant_home(db, me.user_id)
        today = datetime.date.today()
        return {
            "role": "tenant",
            "tenant": home["tenant"],
            "contract": home["contract"],
            "documents": home["documents"],
            "request": home["request"],
            "rates": {
                t.value: rate_crud.get_effective_rate(db, t.value, today)
                for t in RateType
            },
        }

    data = {
        "role": role,
        "counts": dashboard_crud.counts(db),
        "expiring": dashboard_crud.expiring_contracts(db, days=30),
    }
    if role == "admin":
        data["monthly_rent_total"] = dashboard_crud.monthly_rent_total(db)
    return data
