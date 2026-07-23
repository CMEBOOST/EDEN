from fastapi import FastAPI
from .database import Base, engine
from .routers import routers


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="My Apartment API",
    description="ระบบจัดการหอพัก",
    version="1.0.0"
)

app.include_router(routers.router)

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Welcome to Apartment API!",
        "docs_url": "/docs"
    }