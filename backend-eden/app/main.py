from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.audit import AuditMiddleware
from .core.storage import UPLOAD_DIR
from .routers import routers


# schema จัดการผ่าน Alembic:  alembic upgrade head

app = FastAPI(
    title="My Apartment API",
    description="ระบบจัดการหอพัก",
    version="1.0.0"
)

# เปิด CORS ให้ frontend (Vite dev server) ดึง API ได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# บันทึก audit log ทุก request ที่เปลี่ยนข้อมูลและสำเร็จ
app.add_middleware(AuditMiddleware)

# เสิร์ฟไฟล์อัปโหลด (รูป checklist / เอกสาร) ที่ /uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(routers.auth_router)
app.include_router(routers.router)
app.include_router(routers.upload_router)
app.include_router(routers.tenant_router)
app.include_router(routers.document_router)
app.include_router(routers.contract_router)
app.include_router(routers.rate_router)
app.include_router(routers.request_router)
app.include_router(routers.audit_router)
app.include_router(routers.dashboard_router)


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Welcome to Apartment API!",
        "docs_url": "/docs"
    }
