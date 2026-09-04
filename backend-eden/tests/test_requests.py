"""characterization: /contract-requests/* workflow — create, list (row-filtered),
PATCH transitions, DELETE. lock พฤติกรรมปัจจุบันรวม bug ที่จะแก้ทีหลัง (`# QUIRK`)
"""

import datetime

from app.models import models
from tests.factories import make_contract, make_tenant


def _req(
    db,
    contract,
    rtype=models.RequestType.renew,
    status=models.RequestStatus.pending,
    **kw,
):
    r = models.ContractRequest(
        contract_id=contract.contract_id,
        request_type=rtype,
        status=status,
        tenant_note=kw.pop("tenant_note", "ขอ"),
        **kw,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


# ── create ───────────────────────────────────────────────────────────────────
def test_tenant_creates_on_own_contract(client, as_user, db):
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    tenant = db.get(models.Tenants, c.tenant_id)
    as_user(tenant.user)
    res = client.post(
        "/contract-requests/",
        json={
            "contract_id": c.contract_id,
            "request_type": "renew",
            "tenant_note": "ต่อ",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "pending"


def test_tenant_cannot_request_other_contract(client, as_user, db):
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    other = make_tenant(db)
    as_user(other.user)
    res = client.post(
        "/contract-requests/",
        json={
            "contract_id": c.contract_id,
            "request_type": "renew",
            "tenant_note": "x",
        },
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "แจ้งความจำนงได้เฉพาะสัญญาของตัวเอง"


def test_staff_can_request_any_contract(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    res = client.post(
        "/contract-requests/",
        json={
            "contract_id": c.contract_id,
            "request_type": "terminate",
            "tenant_note": "x",
        },
    )
    assert res.status_code == 200


def test_create_missing_contract_404(client, auth_client):
    auth_client(models.Role.staff)
    res = client.post(
        "/contract-requests/",
        json={"contract_id": 999999, "request_type": "renew", "tenant_note": "x"},
    )
    assert res.status_code == 404


def test_one_open_request_per_contract(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    _req(db, c, status=models.RequestStatus.pending)
    res = client.post(
        "/contract-requests/",
        json={
            "contract_id": c.contract_id,
            "request_type": "renew",
            "tenant_note": "x",
        },
    )
    assert res.status_code == 409

    # rejected/completed ไม่บล็อก
    db.query(models.ContractRequest).update({"status": models.RequestStatus.rejected})
    db.commit()
    res = client.post(
        "/contract-requests/",
        json={
            "contract_id": c.contract_id,
            "request_type": "renew",
            "tenant_note": "x",
        },
    )
    assert res.status_code == 200


def test_create_request_requires_active_contract(client, auth_client, db):
    auth_client(models.Role.staff)
    body = {"contract_id": None, "request_type": "renew", "tenant_note": "x"}

    for st in (
        models.ContractStatus.draft,
        models.ContractStatus.expired,
        models.ContractStatus.terminated,
    ):
        c = make_contract(db, room_id=None, status=st)
        res = client.post(
            "/contract-requests/", json={**body, "contract_id": c.contract_id}
        )
        assert res.status_code == 400
        assert res.json()["detail"] == "แจ้งความจำนงได้เฉพาะสัญญาที่ใช้งานอยู่"

    # active + ไม่ใส่ preferred_date → ยังผ่าน (preferred_date ยัง optional)
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    res = client.post(
        "/contract-requests/", json={**body, "contract_id": c.contract_id}
    )
    assert res.status_code == 200
    assert res.json()["preferred_date"] is None


# ── list ─────────────────────────────────────────────────────────────────────
def test_list_row_filtered_for_tenant(client, as_user, db):
    c1 = make_contract(db, room_id=None)
    c2 = make_contract(db, room_id=None)
    _req(db, c1)
    _req(db, c2)
    t1 = db.get(models.Tenants, c1.tenant_id)
    as_user(t1.user)
    rows = client.get("/contract-requests/").json()
    assert {r["contract_id"] for r in rows} == {c1.contract_id}
    # dict shape
    assert "tenant_name" in rows[0] and "security_deposit" in rows[0]
    assert "handled_by" not in rows[0] and "created_by" not in rows[0]


def test_list_empty_for_user_without_tenant_row(client, auth_client, db):
    auth_client(models.Role.tenant)  # user role tenant แต่ไม่มี Tenants row
    make_contract(db, room_id=None)
    assert client.get("/contract-requests/").json() == []


def test_list_staff_sees_all(client, auth_client, db):
    auth_client(models.Role.staff)
    _req(db, make_contract(db, room_id=None))
    _req(db, make_contract(db, room_id=None))
    assert len(client.get("/contract-requests/").json()) == 2


def test_get_one_tenant_not_owner_403(client, as_user, db):
    c = make_contract(db, room_id=None)
    r = _req(db, c)
    other = make_tenant(db)
    as_user(other.user)
    assert client.get(f"/contract-requests/{r.request_id}").status_code == 403


# ── PATCH ────────────────────────────────────────────────────────────────────
def test_patch_is_staff_only(client, as_user, db):
    c = make_contract(db, room_id=None)
    r = _req(db, c)
    as_user(db.get(models.Tenants, c.tenant_id).user)
    assert (
        client.patch(
            f"/contract-requests/{r.request_id}", json={"status": "accepted"}
        ).status_code
        == 403
    )


def test_complete_terminate_needs_checkout_checklist(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    r = _req(db, c, rtype=models.RequestType.terminate)

    res = client.patch(
        f"/contract-requests/{r.request_id}", json={"status": "completed"}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "ต้องบันทึกผลตรวจสภาพห้องออกก่อน"

    db.add(
        models.ContractChecklist(
            contract_id=c.contract_id, type=models.ChecklistType.check_out
        )
    )
    db.commit()
    res = client.patch(
        f"/contract-requests/{r.request_id}", json={"status": "completed"}
    )
    assert res.status_code == 200


def test_complete_renew_does_not_extend_contract(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, end_date=datetime.date(2026, 12, 31))
    r = _req(
        db,
        c,
        rtype=models.RequestType.renew,
        preferred_date=datetime.date(2027, 12, 31),
    )

    client.patch(
        f"/contract-requests/{r.request_id}",
        json={"status": "completed", "preferred_date": "2027-12-31"},
    )
    db.refresh(c)
    # QUIRK: complete renew ไม่ขยาย end_date — ต้อง PUT /contracts เองแยก
    assert c.end_date == datetime.date(2026, 12, 31)


def test_complete_terminate_does_not_change_contract_or_damage(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    # checkout checklist ใส่ตรง ๆ (เลี่ยง side effect ของ route ที่จะ flip status)
    db.add(
        models.ContractChecklist(
            contract_id=c.contract_id, type=models.ChecklistType.check_out
        )
    )
    r = _req(db, c, rtype=models.RequestType.terminate)
    db.commit()

    client.patch(f"/contract-requests/{r.request_id}", json={"status": "completed"})
    db.refresh(c)
    db.refresh(r)
    # QUIRK: complete terminate ไม่แตะ Contracts.status, ไม่คิด damage_total
    assert c.status == models.ContractStatus.active
    assert r.damage_total is None


def test_patch_has_no_state_machine(client, auth_client, db):
    auth_client(models.Role.staff)
    r = _req(db, make_contract(db, room_id=None), status=models.RequestStatus.completed)
    # QUIRK: completed → pending ได้ (ไม่มีการตรวจ transition)
    res = client.patch(f"/contract-requests/{r.request_id}", json={"status": "pending"})
    assert res.status_code == 200
    assert res.json()["status"] == "pending"


def test_handled_by_set_only_on_first_exit_from_pending(client, auth_client, db):
    s1 = auth_client(models.Role.staff)
    r = _req(db, make_contract(db, room_id=None))

    client.patch(f"/contract-requests/{r.request_id}", json={"status": "accepted"})
    db.refresh(r)
    assert r.handled_by == s1.user_id
    assert r.handled_at is not None

    s2 = auth_client(models.Role.staff)
    client.patch(f"/contract-requests/{r.request_id}", json={"status": "completed"})
    db.refresh(r)
    # ไม่อัปเดตซ้ำ — ยังเป็น s1
    assert r.handled_by == s1.user_id
    assert s2.user_id != s1.user_id


# ── DELETE ───────────────────────────────────────────────────────────────────
def test_tenant_delete_own_pending_ok(client, as_user, db):
    c = make_contract(db, room_id=None)
    r = _req(db, c, status=models.RequestStatus.pending)
    as_user(db.get(models.Tenants, c.tenant_id).user)
    res = client.delete(f"/contract-requests/{r.request_id}")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_tenant_delete_non_pending_400(client, as_user, db):
    c = make_contract(db, room_id=None)
    r = _req(db, c, status=models.RequestStatus.accepted)
    as_user(db.get(models.Tenants, c.tenant_id).user)
    assert client.delete(f"/contract-requests/{r.request_id}").status_code == 400


def test_staff_delete_any_status(client, auth_client, db):
    auth_client(models.Role.staff)
    r = _req(db, make_contract(db, room_id=None), status=models.RequestStatus.completed)
    assert client.delete(f"/contract-requests/{r.request_id}").status_code == 200
