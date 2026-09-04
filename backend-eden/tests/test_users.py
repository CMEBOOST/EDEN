"""POST /users/ — staff เพิ่มได้เฉพาะบัญชีผู้เช่า"""

from app.models import models


def _body(role: str, username: str):
    return {"username": username, "password": "pw123456", "role": role}


def test_staff_creates_tenant_account(staff_client):
    res = staff_client.post("/users/", json=_body("tenant", "newtenant"))
    assert res.status_code == 201
    assert res.json()["role"] == "tenant"


def test_staff_cannot_create_staff_or_admin(staff_client):
    for role in ("staff", "admin"):
        res = staff_client.post("/users/", json=_body(role, f"x{role}"))
        assert res.status_code == 403
        assert res.json()["detail"] == "พนักงานเพิ่มบัญชีได้เฉพาะสิทธิ์ผู้เช่า"


def test_admin_creates_any_role(admin_client):
    assert admin_client.post("/users/", json=_body("staff", "s1")).status_code == 201
    assert admin_client.post("/users/", json=_body("admin", "a1")).status_code == 201


def test_staff_still_blocked_from_role_and_status_changes(staff_client, db):
    from tests.factories import make_user

    u = make_user(db, models.Role.staff)
    assert (
        staff_client.patch(
            f"/users/{u.user_id}/role", json={"role": "admin"}
        ).status_code
        == 403
    )
    assert (
        staff_client.patch(f"/users/{u.user_id}", json={"is_active": False}).status_code
        == 403
    )
    assert staff_client.get("/users/").status_code == 200
