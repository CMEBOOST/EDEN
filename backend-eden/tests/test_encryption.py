"""characterization: national_id encryption at rest (app/core/crypto.py) +
tenant response schema split (TenantSummary / TenantOut)
"""

from app.core import crypto
from app.models import models
from tests.factories import make_tenant, make_user, raw_national_id

NID = "1103700001234"


def test_crypto_roundtrip_and_bad_token():
    token = crypto.encrypt(NID)
    assert token.startswith("gAAAAA")
    assert crypto.decrypt(token) == NID
    assert crypto.decrypt("not-a-fernet-token") is None  # ไม่ throw


def test_post_tenant_encrypts_at_rest_and_get_decrypts(client, auth_client, db):
    auth_client(models.Role.staff)
    user = make_user(db, models.Role.tenant)

    res = client.post(
        "/tenants/",
        json={
            "user_id": user.user_id,
            "full_name": "ก",
            "phone": "0800000000",
            "email": "k@example.com",
            "national_id_encrypted": NID,
        },
    )
    assert res.status_code == 200
    tid = res.json()["tenant_id"]

    assert client.get(f"/tenants/{tid}").json()["national_id_encrypted"] == NID
    raw = raw_national_id(db, tid)
    assert raw is not None and raw.startswith("gAAAAA") and raw != NID


def test_list_omits_national_id(client, auth_client, db):
    auth_client(models.Role.staff)
    make_tenant(db, national_id_encrypted=NID)
    rows = client.get("/tenants/").json()
    assert rows and "national_id_encrypted" not in rows[0]


def test_put_without_field_keeps_value_explicit_null_wipes(client, auth_client, db):
    auth_client(models.Role.staff)
    t = make_tenant(db, national_id_encrypted=NID)

    client.put(f"/tenants/{t.tenant_id}", json={"phone": "0899999999"})
    assert client.get(f"/tenants/{t.tenant_id}").json()["national_id_encrypted"] == NID

    client.put(f"/tenants/{t.tenant_id}", json={"national_id_encrypted": None})
    assert client.get(f"/tenants/{t.tenant_id}").json()["national_id_encrypted"] is None
    assert raw_national_id(db, t.tenant_id) is None


def test_tenant_public_exposes_only_boolean(client, as_user, db):
    t = make_tenant(db, national_id_encrypted=NID)
    as_user(t.user)
    body = client.get("/profile/").json()
    assert body["tenant"]["has_national_id"] is True
    assert "national_id_encrypted" not in body["tenant"]
