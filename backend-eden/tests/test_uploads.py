"""/upload/ (create) + GET /uploads/{name} (serve, auth, per-file ownership)"""

from app.core.auth import create_access_token
from app.models import models
from tests.factories import make_contract, make_tenant, make_user


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
    assert res.status_code == 201
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


def test_tenant_cannot_download_other_tenants_file(client, db, upload_dir):
    # ไฟล์ผูกกับเอกสารของ tenant A
    a = make_tenant(db)
    (upload_dir / "a-id-card.png").write_bytes(b"SECRET")
    db.add(
        models.TenantDocument(
            tenant_id=a.tenant_id, doc_type="id", file_url="/uploads/a-id-card.png"
        )
    )
    db.commit()

    tenant_b = make_user(db, models.Role.tenant)
    token = create_access_token(tenant_b.username)
    res = client.get(f"/uploads/a-id-card.png?token={token}")
    assert res.status_code == 404


def test_tenant_can_download_own_files(client, as_user, db, upload_dir):
    t = make_tenant(db)
    for fn in ("av.png", "doc.png", "contract.pdf", "photo.png", "orphan.png"):
        (upload_dir / fn).write_bytes(b"X")

    t.user.avatar_url = "/uploads/av.png"
    db.add(
        models.TenantDocument(
            tenant_id=t.tenant_id, doc_type="id", file_url="/uploads/doc.png"
        )
    )
    c = make_contract(
        db, tenant=t, room_id=None, contract_file_url="/uploads/contract.pdf"
    )
    db.add(
        models.ContractChecklist(
            contract_id=c.contract_id,
            type=models.ChecklistType.check_in,
            photo_urls=["/uploads/photo.png"],
        )
    )
    db.commit()

    as_user(t.user)
    for fn in ("av.png", "doc.png", "contract.pdf", "photo.png"):
        assert client.get(f"/uploads/{fn}").status_code == 200, fn
    # ไฟล์ที่ไม่ผูกกับ record ไหน → 404
    assert client.get("/uploads/orphan.png").status_code == 404


def test_staff_can_download_any_file(client, auth_client, db, upload_dir):
    a = make_tenant(db)
    (upload_dir / "x.png").write_bytes(b"X")
    db.add(
        models.TenantDocument(
            tenant_id=a.tenant_id, doc_type="id", file_url="/uploads/x.png"
        )
    )
    db.commit()
    auth_client(models.Role.staff)
    assert client.get("/uploads/x.png").status_code == 200
