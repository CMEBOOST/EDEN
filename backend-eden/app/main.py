from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app.include_router(routers.router)

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Welcome to Apartment API!",
        "docs_url": "/docs"
    }
