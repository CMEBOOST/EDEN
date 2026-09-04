"""characterization: role guard matrix (app/core/auth.py + router dependencies)"""

import pytest

from app.core.auth import create_access_token
from app.models import models
from tests.factories import make_user

# endpoint ที่ผู้เช่า (tenant) โดน 403 — staff/admin เท่านั้น
TENANT_FORBIDDEN = [
    ("GET", "/contracts/"),
    ("GET", "/contracts/1"),
    ("POST", "/contracts/"),
    ("GET", "/contracts/1/checklists"),
    ("POST", "/contracts/1/checklists"),
    ("GET", "/tenants/"),
    ("GET", "/tenants/1"),
    ("POST", "/tenants/"),
    ("PUT", "/tenants/1"),
    ("GET", "/users/"),
    ("GET", "/users/1"),
    ("GET", "/rooms/"),
    ("GET", "/rates/"),
    ("GET", "/rates/current"),
    ("GET", "/rates/1"),
    ("GET", "/audit-logs/"),
    ("POST", "/upload/"),
    ("DELETE", "/documents/1"),
    ("PATCH", "/contract-requests/1"),
]

# endpoint ที่ staff โดน 403 — admin เท่านั้น
STAFF_FORBIDDEN = [
    ("POST", "/users/"),
    ("PATCH", "/users/1/role"),
    ("POST", "/contracts/run-expire"),
    ("DELETE", "/contracts/1"),
    ("POST", "/rates/"),
    ("PUT", "/rates/1"),
    ("DELETE", "/rates/1"),
    ("GET", "/audit-logs/"),
]

# endpoint ที่ผู้เช่าเข้าถึงได้ (ไม่ใช่ 403/401)
TENANT_ALLOWED = [
    ("GET", "/auth/me"),
    ("GET", "/dashboard/"),
    ("GET", "/profile/"),
    ("GET", "/contract-requests/"),
]


@pytest.mark.parametrize("method,path", TENANT_FORBIDDEN)
def test_tenant_forbidden(auth_client, client, method, path):
    auth_client(models.Role.tenant)
    res = client.request(method, path)
    assert res.status_code == 403
    assert res.json()["detail"] == "ไม่มีสิทธิ์ใช้งานส่วนนี้"


@pytest.mark.parametrize("method,path", STAFF_FORBIDDEN)
def test_staff_forbidden_admin_only(auth_client, client, method, path):
    auth_client(models.Role.staff)
    res = client.request(method, path)
    assert res.status_code == 403


@pytest.mark.parametrize("method,path", TENANT_ALLOWED)
def test_tenant_allowed(auth_client, client, method, path):
    auth_client(models.Role.tenant)
    res = client.request(method, path)
    assert res.status_code != 403
    assert res.status_code != 401


@pytest.mark.parametrize("method,path", TENANT_FORBIDDEN + STAFF_FORBIDDEN)
def test_no_token_401(client, method, path):
    res = client.request(method, path)
    assert res.status_code == 401


def test_bad_token_401(client):
    client.headers["Authorization"] = "Bearer not-a-real-jwt"
    res = client.get("/auth/me")
    assert res.status_code == 401
    assert res.json()["detail"] == "ไม่ได้เข้าสู่ระบบ หรือ token ไม่ถูกต้อง"


def test_inactive_user_403(client, db):
    user = make_user(db, models.Role.staff, is_active=False)
    token = create_access_token(user.username)
    client.headers["Authorization"] = f"Bearer {token}"
    res = client.get("/auth/me")
    assert res.status_code == 403
    assert res.json()["detail"] == "บัญชีนี้ถูกปิดการใช้งาน"
