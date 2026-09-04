from app.models import models
from tests.factories import make_user


def test_login_success(client, db):
    make_user(db, models.Role.staff, username="alice", password="s3cret")
    res = client.post("/auth/login", data={"username": "alice", "password": "s3cret"})
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_login_wrong_password(client, db):
    make_user(db, models.Role.staff, username="bob", password="right")
    res = client.post("/auth/login", data={"username": "bob", "password": "wrong"})
    assert res.status_code == 401


def test_login_inactive_user(client, db):
    make_user(db, models.Role.staff, username="ghost", password="pw", is_active=False)
    res = client.post("/auth/login", data={"username": "ghost", "password": "pw"})
    assert res.status_code == 403


def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_returns_current_user(client, auth_client):
    user = auth_client(models.Role.admin)
    res = client.get("/auth/me")
    assert res.status_code == 200
    body = res.json()
    assert body["username"] == user.username
    assert body["role"] == "admin"
