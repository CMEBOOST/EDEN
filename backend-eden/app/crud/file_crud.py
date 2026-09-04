"""ตรวจสิทธิ์เข้าถึงไฟล์อัปโหลด — reverse lookup: file → เจ้าของ

staff/admin เห็นทุกไฟล์ · tenant เห็นเฉพาะไฟล์ที่ผูกกับ record ของตัวเอง
(avatar / เอกสารผู้เช่า / ไฟล์สัญญา / รูป checklist ของสัญญาตัวเอง)
"""

from sqlalchemy.orm import Session

from ..models import models


def user_may_access(db: Session, user: models.Users, name: str) -> bool:
    role = user.role.value if hasattr(user.role, "value") else user.role
    if role in ("admin", "staff"):
        return True

    url = f"/uploads/{name}"
    if user.avatar_url == url:
        return True

    tenant = (
        db.query(models.Tenants).filter(models.Tenants.user_id == user.user_id).first()
    )
    if tenant is None:
        return False

    own_doc = (
        db.query(models.TenantDocument.doc_id)
        .filter(
            models.TenantDocument.tenant_id == tenant.tenant_id,
            models.TenantDocument.file_url == url,
        )
        .first()
    )
    if own_doc is not None:
        return True

    contract_ids = [
        cid
        for (cid,) in db.query(models.Contracts.contract_id)
        .filter(models.Contracts.tenant_id == tenant.tenant_id)
        .all()
    ]
    if not contract_ids:
        return False

    own_contract_file = (
        db.query(models.Contracts.contract_id)
        .filter(
            models.Contracts.contract_id.in_(contract_ids),
            models.Contracts.contract_file_url == url,
        )
        .first()
    )
    if own_contract_file is not None:
        return True

    photo_lists = (
        db.query(models.ContractChecklist.photo_urls)
        .filter(models.ContractChecklist.contract_id.in_(contract_ids))
        .all()
    )
    return any(url in (photos or []) for (photos,) in photo_lists)
