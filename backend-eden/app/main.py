from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.exc import IntegrityError

from .core.audit import AuditMiddleware
from .core.auth import get_user_for_file
from .core.errors import ErrorHandlerMiddleware
from .core.storage import UPLOAD_DIR
from .routers import routers


# schema จัดการผ่าน Alembic:  alembic upgrade head

app = FastAPI(title="My Apartment API", description="ระบบจัดการหอพัก", version="1.0.0")

# ลำดับ middleware สำคัญ — Starlette ใส่ตัวที่ add ทีหลังไว้ "ชั้นนอกกว่า"
# ชั้นนอก → ชั้นใน:  CORS  →  ErrorHandler  →  Audit  →  router
#   - Audit: บันทึก log (add ก่อน = ชั้นในสุด)
#   - ErrorHandler: จับ exception ที่ไม่ได้ handle → ตอบ JSON 500 (แทน error ดิบของ Starlette)
#   - CORS: add ทีหลังสุด = ชั้นนอกสุด → response ทุกตัว (รวม 500 จาก ErrorHandler)
#     วิ่งผ่าน CORS ขาออก จึงได้ header Access-Control-* ครบ ไม่งั้น browser เห็น "Failed to fetch"
app.add_middleware(AuditMiddleware)
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(IntegrityError)
async def _integrity_error(request: Request, exc: IntegrityError):
    """DB constraint ยิง (unique / check / fk) → 409 แทน 500"""
    return JSONResponse(status_code=409, content={"detail": "ข้อมูลขัดแย้งกับข้อมูลที่มีอยู่"})


# เสิร์ฟไฟล์อัปโหลด (รูป checklist / เอกสาร / avatar) — ต้องล็อกอินก่อน
# <img>/<a> แนบ Authorization header ไม่ได้ → get_user_for_file รับ token ทาง ?token= ด้วย
@app.get("/uploads/{name:path}", include_in_schema=False)
def serve_upload(name: str, _=Depends(get_user_for_file)):
    path = (UPLOAD_DIR / name).resolve()
    if not path.is_relative_to(UPLOAD_DIR.resolve()) or not path.is_file():
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์")
    return FileResponse(path, headers={"Referrer-Policy": "no-referrer"})


app.include_router(routers.auth_router)
app.include_router(routers.router)
app.include_router(routers.upload_router)
app.include_router(routers.tenant_router)
app.include_router(routers.document_router)
app.include_router(routers.contract_router)
app.include_router(routers.room_router)
app.include_router(routers.rate_router)
app.include_router(routers.request_router)
app.include_router(routers.profile_router)
app.include_router(routers.audit_router)
app.include_router(routers.dashboard_router)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to Apartment API!", "docs_url": "/docs"}
