"""characterization: /upload/ (create) + GET /uploads/{name} (serve, auth, no ownership)"""

from app.core.auth import create_access_token
from app.models import models


def test_upload_requires_auth(client):
    assert client.get("/uploads/anything.png").status_code == 401


def test_upload_missing_file_404_with_token(client, auth_client):
    auth_client(models.Role.staff)
    assert client.get("/uploads/does-not-exist.png").status_code == 404


def test_upload_path_traversal_blocked(client, auth_client):
    auth_client(models.Role.admin)
    assert client.get("/uploads/../app/main.py").status_code == 404


def test_post_upload_returns_uuid_name(client, auth_client):
    auth_client(models.Role.staff)
    res = client.post(
        "/upload/", files={"file": ("photo.JPG", b"\xff\xd8\xff", "image/jpeg")}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["url"].startswith("/uploads/")
    name = body["url"].removeprefix("/uploads/")
    stem, _, ext = name.partition(".")
    assert len(stem) == 32 and ext == "jpg"  # uuid4 hex + lowercased ext


def test_post_upload_rejects_bad_extension(client, auth_client):
    auth_client(models.Role.staff)
    res = client.post("/upload/", files={"file": ("notes.txt", b"hi", "text/plain")})
    assert res.status_code == 400


def test_serve_uploaded_file_with_token_or_header(client, auth_client, upload_dir):
    auth_client(models.Role.staff)
    (upload_dir / "doc.png").write_bytes(b"PNGDATA")

    # ?token=
    token = client.headers["Authorization"].removeprefix("Bearer ")
    del client.headers["Authorization"]
    res = client.get(f"/uploads/doc.png?token={token}")
    assert res.status_code == 200
    assert res.content == b"PNGDATA"
    assert res.headers["Referrer-Policy"] == "no-referrer"

    # Authorization header
    client.headers["Authorization"] = f"Bearer {token}"
    assert client.get("/uploads/doc.png").status_code == 200

    # no token
    del client.headers["Authorization"]
    assert client.get("/uploads/doc.png").status_code == 401


def test_no_per_file_ownership_any_tenant_can_download(client, db, upload_dir):
    """QUIRK: ไม่มี per-file ownership — ผู้เช่าคนไหนก็โหลดไฟล์ของคนอื่นได้ถ้ารู้ชื่อไฟล์
    (bug ที่จะปิด — เพิ่ม ownership lookup)"""
    from tests.factories import make_user

    (upload_dir / "tenant-a-id-card.png").write_bytes(b"SECRET")
    tenant_b = make_user(db, models.Role.tenant)
    token = create_access_token(tenant_b.username)

    res = client.get(f"/uploads/tenant-a-id-card.png?token={token}")
    assert res.status_code == 200
    assert res.content == b"SECRET"
