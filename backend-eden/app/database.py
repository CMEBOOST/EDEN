import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# รันในเครื่อง -> ต่อ 127.0.0.1:5433 (ตาม docker-compose ที่ map port ออกมา)
# รันใน Docker  -> ตั้ง env DATABASE_URL ให้ชี้ไปที่ service "postgres"
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:admin123@127.0.0.1:5433/EDEN_DB",
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
    