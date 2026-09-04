"""characterization: AuditMiddleware (app/core/audit.py) + GET /audit-logs/"""

from app.models import models
from tests.factories import make_tenant, make_user


def _log_count(db) -> int:
    return db.query(models.AuditLog).count()


def test_write_2xx_creates_one_row(client, auth_client, db):
    me = auth_client(models.Role.staff)
    user = make_user(db, models.Role.tenant)
    before = _log_count(db)
    res = client.post(
        "/tenants/",
        json={
            "user_id": user.user_id,
            "full_name": "ก",
            "phone": "0800000000",
            "email": "k@example.com",
        },
    )
    assert res.status_code == 200
    rows = db.query(models.AuditLog).order_by(models.AuditLog.log_id.desc()).all()
    assert _log_count(db) == before + 1
    assert rows[0].user_id == me.user_id


def test_get_requests_not_audited(client, auth_client, db):
    auth_client(models.Role.staff)
    before = _log_count(db)
    client.get("/tenants/")
    assert _log_count(db) == before


def test_failed_request_not_audited(client, auth_client, db):
    auth_client(models.Role.staff)
    before = _log_count(db)
    client.post("/tenants/", json={"full_name": "missing required fields"})  # 422
    client.post("/contracts/", json={"tenant_id": 999999})  # 422 / 400
    assert _log_count(db) == before


def test_login_writes_own_audit_row(client, db):
    from tests.factories import make_user

    u = make_user(db, models.Role.admin, username="loginaudit", password="pw")
    client.post("/auth/login", data={"username": u.username, "password": "pw"})
    actions = [
        r.action for r in db.query(models.AuditLog).filter_by(user_id=u.user_id).all()
    ]
    assert "เข้าสู่ระบบ" in actions


def test_tenant_write_is_audited(client, as_user, db):
    t = make_tenant(db)
    as_user(t.user)
    before = _log_count(db)
    client.patch("/profile/tenant", json={"phone": "0811111111"})
    assert _log_count(db) == before + 1


def test_audit_logs_admin_only(client, auth_client):
    auth_client(models.Role.staff)
    assert client.get("/audit-logs/").status_code == 403


def test_audit_logs_shape_and_filters(client, auth_client, db):
    me = auth_client(models.Role.admin)
    res = client.post(
        "/tenants/",
        json={
            "user_id": make_user(db, models.Role.tenant).user_id,
            "full_name": "ข",
            "phone": "0800000000",
            "email": "x@example.com",
        },
    )
    assert res.status_code == 200
    rows = client.get("/audit-logs/").json()
    assert isinstance(rows, list) and rows
    assert set(rows[0]) == {"log_id", "action", "created_at", "user_id", "username"}
    assert rows[0]["username"] == me.username

    assert client.get(f"/audit-logs/?user_id={me.user_id}").json()
    assert client.get("/audit-logs/?user_id=999999").json() == []
