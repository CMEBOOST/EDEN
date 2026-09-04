import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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
    room_crud,
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
        raise HTTPException(status_code=401, detail="username หรือรหัสผ่านไม่ถูกต้อง")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="บัญชีนี้ถูกปิดการใช้งาน")
    audit_crud.write(db, user.user_id, "เข้าสู่ระบบ")
    # บันทึกเวลาล็อกอินล่าสุด (เฉพาะผู้เช่า — คอลัมน์อยู่บน tenants)
    tenant = tenent_crud.get_tenant_by_user(db, user.user_id)
    if tenant is not None:
        tenant.last_login_at = func.now()
        db.commit()
    return schemas.Token(access_token=create_access_token(user.username))


@auth_router.get("/me", response_model=schemas.UserOut)
def me_route(user: models.Users = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Users (จัดการสิทธิ์)
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/",
    response_model=schemas.UserOut,
    dependencies=[Depends(require_admin)],
    status_code=201,
)
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


# เปลี่ยนสิทธิ์ได้เฉพาะระหว่าง admin ↔ staff (บัญชี tenant ล็อก role ไว้)
_SWITCHABLE_ROLES = {models.Role.admin, models.Role.staff}


@router.patch("/{user_id}/role", response_model=schemas.UserOut)
def update_role_route(
    user_id: int,
    data: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_admin),
):
    if user_id == me.user_id:
        raise HTTPException(status_code=400, detail="เปลี่ยน role ของตัวเองไม่ได้")
    target = user_crud.get_user_by_id(db, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    if target.role not in _SWITCHABLE_ROLES or data.role not in _SWITCHABLE_ROLES:
        raise HTTPException(
            status_code=400,
            detail="เปลี่ยนสิทธิ์ได้เฉพาะระหว่าง ผู้ดูแลระบบ ↔ พนักงาน (บัญชีผู้เช่าเปลี่ยนสิทธิ์ไม่ได้)",
        )
    user = user_crud.set_role(db, user_id, data.role)
    return user


@router.patch("/{user_id}", response_model=schemas.UserOut)
def update_user_route(
    user_id: int,
    data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_admin),
):
    fields = data.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="ไม่มีข้อมูลที่จะแก้ไข")

    if "is_active" in fields and user_id == me.user_id:
        raise HTTPException(status_code=400, detail="เปิด/ปิดการใช้งานบัญชีตัวเองไม่ได้")
    if "username" in fields:
        dup = user_crud.get_user_by_username(db, fields["username"])
        if dup is not None and dup.user_id != user_id:
            raise HTTPException(status_code=409, detail="username นี้มีอยู่แล้ว")

    user = user_crud.update_user(db, user_id, fields)
    if user is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    return user


@router.patch(
    "/{user_id}/password",
    response_model=schemas.UserOut,
    dependencies=[Depends(require_admin)],
)
def set_password_route(
    user_id: int, data: schemas.PasswordSet, db: Session = Depends(get_db)
):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="รหัสผ่านสั้นเกินไป (อย่างน้อย 6 ตัว)")
    user = user_crud.set_password(db, user_id, data.new_password)
    if user is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    return user


# ---------------------------------------------------------------------------
# Uploads — static mount อยู่ที่ /uploads แล้ว จึงใช้ /upload สำหรับ POST
# ---------------------------------------------------------------------------
upload_router = APIRouter(prefix="/upload", tags=["Uploads"], dependencies=_staff)


@upload_router.post("/", status_code=201)
def upload_file_route(file: UploadFile = File(...)):
    return {"url": save_upload(file), "filename": file.filename}


# ---------------------------------------------------------------------------
# Tenants
# ---------------------------------------------------------------------------
tenant_router = APIRouter(prefix="/tenants", tags=["Tenants"], dependencies=_staff)


@tenant_router.post(
    "/", response_model=schemas.TenantOut, dependencies=_staff, status_code=201
)
def create_tenant_route(tenant: schemas.Tenants, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_id(db=db, user_id=tenant.user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="ไม่พบ user_id นี้")
    role = user.role.value if hasattr(user.role, "value") else user.role
    if role != "tenant":
        raise HTTPException(status_code=400, detail='บัญชีผู้ใช้ต้องเป็น role "ผู้เช่า" (tenant)')
    if tenent_crud.get_tenant_by_user(db=db, user_id=tenant.user_id) is not None:
        raise HTTPException(status_code=409, detail="บัญชีนี้ลงทะเบียนผู้เช่าไว้แล้ว")
    try:
        return tenent_crud.create_tenant(db=db, tenant=tenant)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="บัญชีนี้ลงทะเบียนผู้เช่าไว้แล้ว")


@tenant_router.get("/", response_model=list[schemas.TenantSummary])
def list_tenants_route(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return tenent_crud.get_tenants(db=db, skip=skip, limit=limit)


@tenant_router.get("/{tenant_id}", response_model=schemas.TenantOut)
def get_tenant_route(tenant_id: int, db: Session = Depends(get_db)):
    tenant = tenent_crud.get_tenant(db=db, tenant_id=tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return tenant


@tenant_router.put(
    "/{tenant_id}", response_model=schemas.TenantOut, dependencies=_staff
)
def update_tenant_route(
    tenant_id: int, data: schemas.TenantUpdate, db: Session = Depends(get_db)
):
    tenant = tenent_crud.update_tenant(
        db=db, tenant_id=tenant_id, fields=data.model_dump(exclude_unset=True)
    )
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
@tenant_router.post("/{tenant_id}/documents", dependencies=_staff, status_code=201)
def create_document_route(
    tenant_id: int,
    data: schemas.DocumentCreate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_staff),
):
    if tenent_crud.get_tenant(db=db, tenant_id=tenant_id) is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return document_crud.create_document(
        db=db, tenant_id=tenant_id, data=data, uploaded_by=me.user_id
    )


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
    return {"ok": True}


# ---------------------------------------------------------------------------
# Contracts
# ---------------------------------------------------------------------------
contract_router = APIRouter(
    prefix="/contracts", tags=["Contracts"], dependencies=_staff
)


@contract_router.post("/", dependencies=_staff, status_code=201)
def create_contract_route(
    contract: schemas.Contracts,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_staff),
):
    """สร้างสัญญา + checklist check-in + เอกสาร ในทรานแซกชันเดียว (atomic)"""
    if tenent_crud.get_tenant(db=db, tenant_id=contract.tenant_id) is None:
        raise HTTPException(status_code=400, detail="ไม่พบ tenant_id นี้")
    if contract.end_date < contract.start_date:
        raise HTTPException(status_code=400, detail="end_date ต้องไม่ก่อน start_date")
    if contract.status == ContractStatus.terminated:
        raise HTTPException(
            status_code=400,
            detail="สร้างสัญญาสถานะ 'ยกเลิก' ไม่ได้ — ยุติสัญญาที่มีอยู่แทน",
        )
    if contract.room_id is not None:
        if not room_crud.room_exists(db=db, room_id=contract.room_id):
            raise HTTPException(status_code=400, detail="ไม่พบห้องนี้")
        busy = room_crud.active_contract_for_room(db=db, room_id=contract.room_id)
        if busy is not None:
            raise HTTPException(
                status_code=409,
                detail=f"ห้อง {contract.room_id} มีสัญญาอยู่แล้ว (#{busy})",
            )

    try:
        new_contract = contracts_crud.create_contract(
            db=db, contract=contract, created_by=me.user_id, commit=False
        )
        if contract.checkin_items or contract.tenant_signature:
            checklist_crud.create_checklist(
                db=db,
                contract_id=new_contract.contract_id,
                data=schemas.ChecklistCreate(
                    type=ChecklistType.check_in,
                    items=contract.checkin_items,
                    tenant_signature=contract.tenant_signature,
                ),
                created_by=me.user_id,
                commit=False,
            )
        for doc in contract.documents:
            document_crud.create_document(
                db=db,
                tenant_id=contract.tenant_id,
                data=doc,
                uploaded_by=me.user_id,
                commit=False,
            )
        db.commit()
        db.refresh(new_contract)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="ข้อมูลขัดแย้ง (เช่น ห้องถูกใช้ไปแล้ว)")
    return new_contract


@contract_router.post("/run-expire", dependencies=_admin)
def run_expire_route(db: Session = Depends(get_db)):
    """ตั้งสัญญา active ที่เลย end_date เป็น expired — เอาไป cron วันละครั้ง"""
    return {"expired": contracts_crud.expire_overdue(db)}


@contract_router.get("/")
def list_contracts_route(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int | None = None,
    finished: bool | None = None,
    db: Session = Depends(get_db),
):
    return contracts_crud.get_contracts(
        db=db, skip=skip, limit=limit, tenant_id=tenant_id, finished=finished
    )


@contract_router.get("/{contract_id:int}")
def get_contract_route(contract_id: int, db: Session = Depends(get_db)):
    contract = contracts_crud.get_contract(db=db, contract_id=contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return contract


@contract_router.put("/{contract_id:int}")
def update_contract_route(
    contract_id: int,
    data: schemas.ContractUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_staff),
):
    # ยุติสัญญา (terminated) = เฉพาะ admin (UC3.5)
    if data.status == ContractStatus.terminated and me.role != models.Role.admin:
        raise HTTPException(status_code=403, detail="เฉพาะผู้ดูแลระบบยุติสัญญาได้")

    current = contracts_crud.get_contract(db=db, contract_id=contract_id)
    if current is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")

    new_start = data.start_date or current.start_date
    new_end = data.end_date or current.end_date
    if new_end < new_start:
        raise HTTPException(status_code=400, detail="end_date ต้องไม่ก่อน start_date")

    if data.room_id is not None:
        if not room_crud.room_exists(db=db, room_id=data.room_id):
            raise HTTPException(status_code=400, detail="ไม่พบห้องนี้")
        busy = room_crud.active_contract_for_room(
            db=db, room_id=data.room_id, exclude_contract_id=contract_id
        )
        if busy is not None:
            raise HTTPException(
                status_code=409,
                detail=f"ห้อง {data.room_id} มีสัญญาอยู่แล้ว (#{busy})",
            )
    try:
        contract = contracts_crud.update_contract(
            db=db, contract_id=contract_id, data=data
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="ข้อมูลขัดแย้ง")
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return contract


@contract_router.delete("/{contract_id:int}", dependencies=_admin)
def delete_contract_route(contract_id: int, db: Session = Depends(get_db)):
    contract = contracts_crud.delete_contract(db=db, contract_id=contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return {"ok": True}


# --- checklist สภาพห้อง ---
@contract_router.post(
    "/{contract_id:int}/checklists", dependencies=_staff, status_code=201
)
def create_checklist_route(
    contract_id: int,
    data: schemas.ChecklistCreate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_staff),
):
    contract = contracts_crud.get_contract(db=db, contract_id=contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")

    checklist = checklist_crud.create_checklist(
        db=db, contract_id=contract_id, data=data, created_by=me.user_id, commit=False
    )

    # ตรวจคืนห้อง (check-out) = สิ้นสุดกระบวนการเช่า → ยุติสัญญาอัตโนมัติ
    # เฉพาะสัญญาที่ยัง draft/active (expired คงไว้) · staff ทำได้เลย ไม่ต้องรอ admin
    if data.type == ChecklistType.check_out and contract.status in (
        ContractStatus.draft,
        ContractStatus.active,
    ):
        contract.status = ContractStatus.terminated

    db.commit()
    db.refresh(checklist)
    return checklist


@contract_router.get("/{contract_id:int}/checklists")
def list_checklists_route(contract_id: int, db: Session = Depends(get_db)):
    return checklist_crud.get_checklists(db=db, contract_id=contract_id)


@contract_router.patch("/{contract_id:int}/checklists/{cc_id:int}", dependencies=_staff)
def update_checklist_route(
    contract_id: int,
    cc_id: int,
    data: schemas.ChecklistUpdate,
    db: Session = Depends(get_db),
):
    existing = checklist_crud.get_checklist(db=db, cc_id=cc_id)
    if existing is None or existing.contract_id != contract_id:
        raise HTTPException(status_code=404, detail="ไม่พบบันทึกสภาพห้อง")
    return checklist_crud.update_checklist(db=db, cc_id=cc_id, data=data)


@contract_router.delete(
    "/{contract_id:int}/checklists/{cc_id:int}", dependencies=_staff
)
def delete_checklist_route(contract_id: int, cc_id: int, db: Session = Depends(get_db)):
    existing = checklist_crud.get_checklist(db=db, cc_id=cc_id)
    if existing is None or existing.contract_id != contract_id:
        raise HTTPException(status_code=404, detail="ไม่พบบันทึกสภาพห้อง")
    checklist_crud.delete_checklist(db=db, cc_id=cc_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Rooms (ห้องพัก — demo, seed คงที่ · สถานะว่าง/ไม่ว่างคำนวณสดจากสัญญา)
# ---------------------------------------------------------------------------
room_router = APIRouter(prefix="/rooms", tags=["Rooms"], dependencies=_staff)


@room_router.get("/", response_model=list[schemas.RoomOut])
def list_rooms_route(available: bool = False, db: Session = Depends(get_db)):
    rows = room_crud.get_rooms(db=db, available_only=available)
    return [
        schemas.RoomOut(
            room_id=room.room_id,
            floor=room.floor,
            base_rent=float(room.base_rent),
            status="occupied" if contract_id else "available",
            contract_id=contract_id,
        )
        for room, contract_id in rows
    ]


# ---------------------------------------------------------------------------
# Rate configs (อัตราค่าน้ำ / ค่าไฟ)
# ---------------------------------------------------------------------------
rate_router = APIRouter(prefix="/rates", tags=["Rates"], dependencies=_auth)


@rate_router.post("/", dependencies=_admin, status_code=201)
def create_rate_route(
    rate: schemas.RateConfig,
    db: Session = Depends(get_db),
    me: models.Users = Depends(require_admin),
):
    dup = rate_crud.rate_exists(db, rate.type, rate.effective_date)
    if dup is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"มีอัตรา {rate.type.value} สำหรับวันที่ {rate.effective_date} อยู่แล้ว",
                "existing_rate_id": dup.rate_id,
            },
        )
    return rate_crud.create_rate(db=db, rate=rate, created_by=me.user_id)


@rate_router.get("/", dependencies=_staff)
def list_rates_route(type: str | None = None, db: Session = Depends(get_db)):
    return rate_crud.get_rates(db=db, type_=type)


@rate_router.get("/current", dependencies=_staff)
def current_rates_route(
    date: datetime.date | None = None, db: Session = Depends(get_db)
):
    """อัตราที่มีผล ณ วันที่ที่ระบุ (ไม่ระบุ = วันนี้) แยกตามประเภท"""
    on_date = date or datetime.date.today()
    return {
        t.value: rate_crud.get_effective_rate(db, t.value, on_date) for t in RateType
    }


@rate_router.get("/{rate_id}", dependencies=_staff)
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
    return {"ok": True}


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


@request_router.post("/", status_code=201)
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

    if contract.status != ContractStatus.active:
        raise HTTPException(status_code=400, detail="แจ้งความจำนงได้เฉพาะสัญญาที่ใช้งานอยู่")

    if request_crud.has_open_request(db=db, contract_id=data.contract_id) is not None:
        raise HTTPException(status_code=409, detail="มีคำแจ้งความจำนงที่ยังไม่ดำเนินการอยู่แล้ว")

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
    try:
        req = request_crud.update_request(
            db=db, request_id=request_id, data=data, handled_by=me.user_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if req is None:
        raise HTTPException(status_code=404, detail="ไม่พบคำแจ้งความจำนง")
    return req


@request_router.delete("/{request_id}")
def delete_request_route(
    request_id: int,
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    req = request_crud.get_request(db=db, request_id=request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="ไม่พบคำแจ้งความจำนง")

    # ผู้เช่ายกเลิกได้เฉพาะคำขอของตัวเองที่ยังไม่ถูกดำเนินการ (แจ้งผิด/มือลั่น)
    if _role(me) == "tenant":
        tenant = tenent_crud.get_tenant_by_user(db=db, user_id=me.user_id)
        contract = contracts_crud.get_contract(db=db, contract_id=req.contract_id)
        if tenant is None or contract is None or contract.tenant_id != tenant.tenant_id:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ยกเลิกคำขอนี้")
        if req.status != RequestStatus.pending:
            raise HTTPException(
                status_code=400,
                detail="ยกเลิกได้เฉพาะคำขอที่เจ้าหน้าที่ยังไม่รับเรื่อง",
            )

    request_crud.delete_request(db=db, request_id=request_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Profile — จัดการโปรไฟล์ของตัวเอง (ทุก role)
# ---------------------------------------------------------------------------
profile_router = APIRouter(prefix="/profile", tags=["Profile"], dependencies=_auth)

_SENSITIVE_TENANT = {"national_id_encrypted", "user_id", "tenant_id", "last_login_at"}


def _tenant_public(tenant: models.Tenants) -> dict:
    return {
        "tenant_id": tenant.tenant_id,
        "full_name": tenant.full_name,
        "phone": tenant.phone,
        "email": tenant.email,
        "current_address": tenant.current_address,
        "emergency_contact": tenant.emergency_contact,
        "has_national_id": bool(tenant.national_id_encrypted),
    }


@profile_router.get("/")
def get_profile_route(
    db: Session = Depends(get_db), me: models.Users = Depends(get_current_user)
):
    tenant = tenent_crud.get_tenant_by_user(db=db, user_id=me.user_id)
    return {
        "user": schemas.UserOut.model_validate(me),
        "tenant": _tenant_public(tenant) if tenant is not None else None,
    }


@profile_router.patch("/avatar", response_model=schemas.UserOut)
def update_profile_avatar_route(
    data: schemas.AvatarUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    return user_crud.update_user(db, me.user_id, {"avatar_url": data.avatar_url})


@profile_router.post("/avatar", response_model=schemas.UserOut)
def upload_profile_avatar_route(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    url = save_upload(file)
    return user_crud.update_user(db, me.user_id, {"avatar_url": url})


@profile_router.patch("/password")
def change_password_route(
    data: schemas.PasswordChange,
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    if not verify_password(data.current_password, me.password_hash):
        raise HTTPException(status_code=400, detail="รหัสผ่านเดิมไม่ถูกต้อง")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="รหัสผ่านใหม่สั้นเกินไป (อย่างน้อย 6 ตัว)")
    user_crud.set_password(db, me.user_id, data.new_password)
    return {"ok": True}


@profile_router.patch("/tenant")
def update_profile_tenant_route(
    data: schemas.ProfileTenantUpdate,
    db: Session = Depends(get_db),
    me: models.Users = Depends(get_current_user),
):
    tenant = tenent_crud.get_tenant_by_user(db=db, user_id=me.user_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="บัญชีนี้ไม่ได้ผูกกับผู้เช่า")
    fields = {
        k: v
        for k, v in data.model_dump(exclude_unset=True).items()
        if k not in _SENSITIVE_TENANT
    }
    updated = tenent_crud.update_tenant(
        db=db, tenant_id=tenant.tenant_id, fields=fields
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return _tenant_public(updated)


# ---------------------------------------------------------------------------
# Dashboard (แตกข้อมูลตาม role)
# ---------------------------------------------------------------------------
dashboard_router = APIRouter(
    prefix="/dashboard", tags=["Dashboard"], dependencies=_auth
)


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
            "tenant": _tenant_public(home["tenant"]) if home["tenant"] else None,
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
