"""characterization: GET /dashboard/ — role split (admin / staff / tenant)"""

import datetime

from app.models import models
from tests.factories import make_contract, make_tenant


def test_admin_dashboard_has_rent_total(client, auth_client, db):
    auth_client(models.Role.admin)
    make_contract(db, room_id=None, status=models.ContractStatus.active, rent=5000)
    make_contract(db, room_id=None, status=models.ContractStatus.draft)

    body = client.get("/dashboard/").json()
    assert body["role"] == "admin"
    assert set(body["counts"]) == {
        "tenants",
        "contracts_active",
        "contracts_draft",
        "requests_pending",
    }
    assert body["counts"]["contracts_active"] == 1
    assert body["counts"]["contracts_draft"] == 1
    assert body["monthly_rent_total"] == 5000


def test_staff_dashboard_omits_rent_total(client, auth_client, db):
    auth_client(models.Role.staff)
    body = client.get("/dashboard/").json()
    assert body["role"] == "staff"
    assert "monthly_rent_total" not in body
    assert "counts" in body and "expiring" in body


def test_expiring_includes_past_due_active(client, auth_client, db):
    auth_client(models.Role.admin)
    past = datetime.date.today() - datetime.timedelta(days=3)
    c = make_contract(
        db, room_id=None, status=models.ContractStatus.active, end_date=past
    )

    expiring = client.get("/dashboard/").json()["expiring"]
    row = next(x for x in expiring if x["contract_id"] == c.contract_id)
    assert set(row) == {
        "contract_id",
        "tenant_name",
        "room_id",
        "end_date",
        "days_left",
    }
    assert row["days_left"] < 0


def test_tenant_dashboard_shape(client, as_user, db):
    c = make_contract(db, room_id=None)
    t = db.get(models.Tenants, c.tenant_id)
    db.add(
        models.TenantDocument(
            tenant_id=t.tenant_id, doc_type="id", file_url="/uploads/x"
        )
    )
    db.commit()
    as_user(t.user)

    body = client.get("/dashboard/").json()
    assert body["role"] == "tenant"
    assert body["tenant"]["tenant_id"] == t.tenant_id
    assert body["contract"]["contract_id"] == c.contract_id
    assert len(body["documents"]) == 1
    assert set(body["rates"]) == {"water", "electric"}


def test_tenant_dashboard_without_tenant_row(client, auth_client):
    auth_client(models.Role.tenant)  # user role tenant, no Tenants row
    body = client.get("/dashboard/").json()
    assert body["tenant"] is None
    assert body["contract"] is None
    assert body["documents"] == []
