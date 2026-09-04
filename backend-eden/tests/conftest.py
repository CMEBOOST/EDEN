"""pytest harness — DB แยก (eden_test), สร้าง schema ด้วย alembic, ล้างตารางทุกเทสต์

รันต้องมี Postgres อยู่ (local: `docker compose up -d postgres` → 127.0.0.1:5433).
ตั้ง env `DATABASE_URL` ได้ — จะถูก rewrite ให้ชี้ database ชื่อ `eden_test` บน server เดียวกัน
"""

import os
from pathlib import Path

from sqlalchemy import create_engine, insert, text
from sqlalchemy.engine import make_url

_BACKEND_DIR = Path(__file__).resolve().parent.parent

# ── ชี้ DB ทดสอบก่อน import app ใด ๆ (app.database อ่าน DATABASE_URL ตอน import) ──
_SRC_URL = make_url(
    os.environ.get(
        "DATABASE_URL", "postgresql://postgres:admin123@127.0.0.1:5433/EDEN_DB"
    )
)
TEST_DB = "eden_test"


def _url_str(db_name: str) -> str:
    return _SRC_URL.set(database=db_name).render_as_string(hide_password=False)


os.environ["DATABASE_URL"] = _url_str(TEST_DB)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core import security  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import models  # noqa: E402  ลงทะเบียนทุกตารางกับ Base.metadata
from tests.factories import make_user  # noqa: E402

_ADMIN_URL = _url_str("postgres")
_FLOOR_RENT = {1: 4500, 2: 4000, 3: 3500, 4: 3000}


def _room_rows() -> list[dict]:
    return [
        {"room_id": f * 100 + n, "floor": f, "base_rent": _FLOOR_RENT[f]}
        for f in (1, 2, 3, 4)
        for n in range(1, 11)
    ]


def _drop_and_create() -> None:
    admin = create_engine(_ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB}" WITH (FORCE)'))
        conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
    admin.dispose()


@pytest.fixture(scope="session", autouse=True)
def _database():
    security.BCRYPT_ROUNDS = 4  # เทสต์สร้าง user เยอะ — rounds 12 ช้าเกินไป
    _drop_and_create()

    from alembic import command
    from alembic.config import Config

    cfg = Config(str(_BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    command.upgrade(cfg, "head")

    yield

    engine.dispose()
    admin = create_engine(_ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB}" WITH (FORCE)'))
    admin.dispose()


@pytest.fixture(autouse=True)
def _clean_tables():
    """เริ่มทุกเทสต์ด้วยตารางว่าง + rooms ที่ seed ไว้ (เทสต์ contract ต้องใช้)"""
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
        conn.execute(insert(models.Room), _room_rows())
    yield


@pytest.fixture(autouse=True)
def upload_dir(tmp_path, monkeypatch):
    """กันเทสต์เขียนไฟล์จริงลง backend-eden/uploads/ — ชี้ไป tmp แทน"""
    d = tmp_path / "uploads"
    d.mkdir()
    monkeypatch.setattr("app.core.storage.UPLOAD_DIR", d)
    monkeypatch.setattr("app.main.UPLOAD_DIR", d)
    return d


@pytest.fixture
def db():
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_client(client, db):
    """auth_client(role) → สร้าง user + login + ตั้ง Authorization header บน client, คืน user"""

    def _login(role: models.Role = models.Role.staff, *, password: str = "pw", **kw):
        user = make_user(db, role, password=password, **kw)
        res = client.post(
            "/auth/login", data={"username": user.username, "password": password}
        )
        assert res.status_code == 200, res.text
        client.headers["Authorization"] = f"Bearer {res.json()['access_token']}"
        return user

    return _login


@pytest.fixture
def as_user(client):
    """as_user(existing_user) → ตั้ง Authorization header เป็น user นั้น (ไม่ผ่าน bcrypt login)"""
    from app.core.auth import create_access_token

    def _set(user: models.Users):
        client.headers["Authorization"] = f"Bearer {create_access_token(user.username)}"
        return user

    return _set


@pytest.fixture
def admin_client(auth_client, client):
    auth_client(models.Role.admin)
    return client


@pytest.fixture
def staff_client(auth_client, client):
    auth_client(models.Role.staff)
    return client


@pytest.fixture
def tenant_client(auth_client, client):
    auth_client(models.Role.tenant)
    return client
