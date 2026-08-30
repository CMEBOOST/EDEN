from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..core.storage import save_upload
from ..crud import (
    checklist_crud,
    contracts_crud,
    document_crud,
    rate_crud,
    tenent_crud,
    user_crud,
)
from ..database import get_db
from ..schemas import schemas

# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/")
def create_user_route(user: schemas.User, db: Session = Depends(get_db)):
    return user_crud.create_user(db=db, user=user)


@router.get("/")
def get_users_route(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return user_crud.get_user(db=db, skip=skip, limit=limit)


# ---------------------------------------------------------------------------
# Uploads (ไฟล์รูป / เอกสาร)
# หมายเหตุ: static mount อยู่ที่ /uploads แล้ว (main.py) จึงใช้ /upload สำหรับ POST
# ---------------------------------------------------------------------------
upload_router = APIRouter(prefix="/upload", tags=["Uploads"])


@upload_router.post("/")
def upload_file_route(file: UploadFile = File(...)):
    return {"url": save_upload(file), "filename": file.filename}


# ---------------------------------------------------------------------------
# Tenants
# ---------------------------------------------------------------------------
tenant_router = APIRouter(prefix="/tenants", tags=["Tenants"])


@tenant_router.post("/")
def create_tenant_route(tenant: schemas.Tenants, db: Session = Depends(get_db)):
    if user_crud.get_user_by_id(db=db, user_id=tenant.user_id) is None:
        raise HTTPException(status_code=400, detail="ไม่พบ user_id นี้")
    return tenent_crud.create_tenant(db=db, tenant=tenant)


@tenant_router.get("/")
def list_tenants_route(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return tenent_crud.get_tenants(db=db, skip=skip, limit=limit)


@tenant_router.get("/{tenant_id}")
def get_tenant_route(tenant_id: int, db: Session = Depends(get_db)):
    tenant = tenent_crud.get_tenant(db=db, tenant_id=tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return tenant


@tenant_router.put("/{tenant_id}")
def update_tenant_route(
    tenant_id: int, data: schemas.TenantUpdate, db: Session = Depends(get_db)
):
    tenant = tenent_crud.update_tenant(db=db, tenant_id=tenant_id, data=data)
    if tenant is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return tenant


@tenant_router.delete("/{tenant_id}")
def delete_tenant_route(tenant_id: int, db: Session = Depends(get_db)):
    tenant = tenent_crud.delete_tenant(db=db, tenant_id=tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="ไม่พบผู้เช่า")
    return {"delete": "ok"}


# --- เอกสารของผู้เช่า ---
@tenant_router.post("/{tenant_id}/documents")
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
document_router = APIRouter(prefix="/documents", tags=["Documents"])


@document_router.delete("/{doc_id}")
def delete_document_route(doc_id: int, db: Session = Depends(get_db)):
    doc = document_crud.delete_document(db=db, doc_id=doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    return {"delete": "ok"}


# ---------------------------------------------------------------------------
# Contracts
# ---------------------------------------------------------------------------
contract_router = APIRouter(prefix="/contracts", tags=["Contracts"])


@contract_router.post("/")
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
    limit: int = 10,
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
    contract_id: int, data: schemas.ContractUpdate, db: Session = Depends(get_db)
):
    contract = contracts_crud.update_contract(db=db, contract_id=contract_id, data=data)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return contract


@contract_router.delete("/{contract_id}")
def delete_contract_route(contract_id: int, db: Session = Depends(get_db)):
    contract = contracts_crud.delete_contract(db=db, contract_id=contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="ไม่พบสัญญา")
    return {"delete": "ok"}


# --- checklist สภาพห้อง ---
@contract_router.post("/{contract_id}/checklists")
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
rate_router = APIRouter(prefix="/rates", tags=["Rates"])


@rate_router.post("/")
def create_rate_route(rate: schemas.RateConfig, db: Session = Depends(get_db)):
    return rate_crud.create_rate(db=db, rate=rate)


@rate_router.get("/")
def list_rates_route(type: str | None = None, db: Session = Depends(get_db)):
    return rate_crud.get_rates(db=db, type_=type)


@rate_router.get("/{rate_id}")
def get_rate_route(rate_id: int, db: Session = Depends(get_db)):
    rate = rate_crud.get_rate(db=db, rate_id=rate_id)
    if rate is None:
        raise HTTPException(status_code=404, detail="ไม่พบอัตราค่าบริการ")
    return rate


@rate_router.put("/{rate_id}")
def update_rate_route(
    rate_id: int, data: schemas.RateConfigUpdate, db: Session = Depends(get_db)
):
    rate = rate_crud.update_rate(db=db, rate_id=rate_id, data=data)
    if rate is None:
        raise HTTPException(status_code=404, detail="ไม่พบอัตราค่าบริการ")
    return rate


@rate_router.delete("/{rate_id}")
def delete_rate_route(rate_id: int, db: Session = Depends(get_db)):
    rate = rate_crud.delete_rate(db=db, rate_id=rate_id)
    if rate is None:
        raise HTTPException(status_code=404, detail="ไม่พบอัตราค่าบริการ")
    return {"delete": "ok"}
