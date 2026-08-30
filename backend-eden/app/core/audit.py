"""Audit middleware — บันทึกทุก request ที่เปลี่ยนข้อมูลและสำเร็จ ลง audit_logs"""
from starlette.middleware.base import BaseHTTPMiddleware

from ..crud import audit_crud, user_crud
from ..database import SessionLocal
from .auth import username_from_token

_VERB = {"POST": "เพิ่ม", "PUT": "แก้ไข", "PATCH": "แก้ไข", "DELETE": "ลบ"}
_ENTITY = {
    "users": "ผู้ใช้",
    "tenants": "ผู้เช่า",
    "contracts": "สัญญา",
    "rates": "อัตราค่าบริการ",
    "documents": "เอกสาร",
}


def describe(method: str, path: str) -> str:
    """แปลง method + path เป็นข้อความอ่านง่าย"""
    parts = [p for p in path.split("/") if p]
    verb = _VERB.get(method, method)
    if not parts:
        return f"{verb} {path}"

    if parts[0] == "upload":
        return "อัปโหลดไฟล์"
    if len(parts) >= 3 and parts[0] == "users" and parts[2] == "role":
        return f"เปลี่ยนสิทธิ์ผู้ใช้ #{parts[1]}"
    if len(parts) == 2 and parts[0] == "users" and method == "PATCH":
        return f"เปิด/ปิดการใช้งานผู้ใช้ #{parts[1]}"
    if len(parts) >= 3 and parts[0] == "tenants" and parts[2] == "documents":
        return f"เพิ่มเอกสารของผู้เช่า #{parts[1]}"
    if len(parts) >= 3 and parts[0] == "contracts" and parts[2] == "checklists":
        return f"บันทึกสภาพห้อง สัญญา #{parts[1]}"

    entity = _ENTITY.get(parts[0], parts[0])
    if len(parts) >= 2 and parts[1].isdigit():
        return f"{verb}{entity} #{parts[1]}"
    return f"{verb}{entity}"


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        if request.method not in _VERB:
            return response
        if not (200 <= response.status_code < 300):
            return response
        path = request.url.path
        if path.startswith("/auth"):  # login บันทึกเองใน route
            return response

        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.startswith("Bearer ") else None
        username = username_from_token(token)
        if not username:
            return response

        db = SessionLocal()
        try:
            user = user_crud.get_user_by_username(db, username)
            if user is not None:
                audit_crud.write(db, user.user_id, describe(request.method, path))
        finally:
            db.close()
        return response
