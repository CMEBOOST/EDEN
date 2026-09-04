"""characterization: /contracts/* — create (atomic), list + finished filter,
run-expire, PUT/DELETE checklist side effects
"""

import datetime

from app.models import models
from tests.factories import make_contract, make_tenant

TODAY = datetime.date.today()


def _payload(tenant_id, **over):
    body = {
        "tenant_id": tenant_id,
        "room_id": None,
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
        "rent": 4500,
        "security_deposit": 4500,
    }
    body.update(over)
    return body


# ── create ────────────────────────────────────────────────────────────────────
def test_create_returns_200_not_201_contract_only(client, auth_client, db):
    me = auth_client(models.Role.staff)
    tenant = make_tenant(db)

    res = client.post("/contracts/", json=_payload(tenant.tenant_id, room_id=105))

    assert res.status_code == 200  # QUIRK: 200 ไม่ใช่ 201
    body = res.json()
    assert body["created_by"] == me.user_id
    assert body["status"] == "draft"
    assert "checklist" not in body and "documents" not in body


def test_create_with_checkin_items_creates_checkin_checklist(client, auth_client, db):
    auth_client(models.Role.staff)
    tenant = make_tenant(db)

    res = client.post(
        "/contracts/",
        json=_payload(
            tenant.tenant_id,
            checkin_items=[{"name": "แอร์", "status": "ปกติ"}],
        ),
    )
    cid = res.json()["contract_id"]

    rows = db.query(models.ContractChecklist).filter_by(contract_id=cid).all()
    assert len(rows) == 1
    assert rows[0].type == models.ChecklistType.check_in


def test_create_signature_only_still_creates_checklist(client, auth_client, db):
    auth_client(models.Role.staff)
    tenant = make_tenant(db)
    res = client.post(
        "/contracts/", json=_payload(tenant.tenant_id, tenant_signature="data:img")
    )
    cid = res.json()["contract_id"]
    assert db.query(models.ContractChecklist).filter_by(contract_id=cid).count() == 1


def test_create_no_checkin_no_checklist(client, auth_client, db):
    auth_client(models.Role.staff)
    tenant = make_tenant(db)
    res = client.post("/contracts/", json=_payload(tenant.tenant_id))
    cid = res.json()["contract_id"]
    assert db.query(models.ContractChecklist).filter_by(contract_id=cid).count() == 0


def test_create_documents_attach_to_tenant(client, auth_client, db):
    me = auth_client(models.Role.staff)
    tenant = make_tenant(db)
    res = client.post(
        "/contracts/",
        json=_payload(
            tenant.tenant_id,
            documents=[{"doc_type": "id_card", "file_url": "/uploads/x.png"}],
        ),
    )
    assert res.status_code == 200
    doc = db.query(models.TenantDocument).filter_by(tenant_id=tenant.tenant_id).one()
    assert doc.uploaded_by == me.user_id


def test_create_rejects_terminated_status(client, auth_client, db):
    auth_client(models.Role.staff)
    tenant = make_tenant(db)

    # draft/active/expired — สร้างได้ (backfill ข้อมูลเก่า / ผู้เช่าเข้าอยู่แล้ว)
    for st in ("active", "expired"):
        res = client.post("/contracts/", json=_payload(tenant.tenant_id, status=st))
        assert res.status_code == 200
        assert res.json()["status"] == st

    # terminated — ตายตั้งแต่เกิด ไม่มีเหตุผล → 400
    res = client.post(
        "/contracts/", json=_payload(tenant.tenant_id, status="terminated")
    )
    assert res.status_code == 400


def test_create_validation_paths(client, auth_client, db):
    auth_client(models.Role.staff)
    tenant = make_tenant(db)

    assert client.post("/contracts/", json=_payload(999999)).status_code == 400
    assert (
        client.post(
            "/contracts/",
            json=_payload(
                tenant.tenant_id, start_date="2026-06-01", end_date="2026-01-01"
            ),
        ).status_code
        == 400
    )
    # start == end ผ่าน
    assert (
        client.post(
            "/contracts/",
            json=_payload(
                tenant.tenant_id, start_date="2026-06-01", end_date="2026-06-01"
            ),
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/contracts/", json=_payload(tenant.tenant_id, room_id=99999)
        ).status_code
        == 400
    )


def test_create_room_busy_409(client, auth_client, db):
    auth_client(models.Role.staff)
    t1, t2 = make_tenant(db), make_tenant(db)
    assert (
        client.post("/contracts/", json=_payload(t1.tenant_id, room_id=105)).status_code
        == 200
    )
    res = client.post("/contracts/", json=_payload(t2.tenant_id, room_id=105))
    assert res.status_code == 409
    assert "105" in res.json()["detail"]


def test_create_room_not_checked_when_null(client, auth_client, db):
    auth_client(models.Role.staff)
    make_contract(db, room_id=105, status=models.ContractStatus.active)
    t = make_tenant(db)
    # room_id=None → ไม่เช็คห้องว่าง
    assert (
        client.post("/contracts/", json=_payload(t.tenant_id, room_id=None)).status_code
        == 200
    )


def test_create_rollback_on_integrity_error(client, auth_client, db):
    auth_client(models.Role.staff)
    tenant = make_tenant(db)
    # rent ติดลบ → CHECK ck_contract_amounts พัง → rollback ทั้งก้อน
    res = client.post(
        "/contracts/",
        json=_payload(tenant.tenant_id, rent=-1, checkin_items=[{"name": "x"}]),
    )
    assert res.status_code == 409
    assert db.query(models.Contracts).filter_by(tenant_id=tenant.tenant_id).count() == 0
    assert db.query(models.ContractChecklist).count() == 0


# ── list + finished quirk ─────────────────────────────────────────────────────
def test_list_ignores_unknown_params(client, auth_client, db):
    auth_client(models.Role.staff)
    make_contract(db, room_id=None)
    res = client.get("/contracts/?status=active&room=105")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_finished_filter_by_lifecycle_status(client, auth_client, db):
    me = auth_client(models.Role.staff)
    by_status = {
        s: make_contract(db, room_id=None, status=s).contract_id
        for s in models.ContractStatus
    }
    # active + มี check-out checklist → checklist ไม่มีผลต่อ filter
    db.add(
        models.ContractChecklist(
            contract_id=by_status[models.ContractStatus.active],
            type=models.ChecklistType.check_out,
            created_by=me.user_id,
        )
    )
    db.commit()

    def ids(url):
        return {x["contract_id"] for x in client.get(url).json()}

    assert ids("/contracts/") == set(by_status.values())  # ไม่ส่ง = ทั้งหมด
    assert ids("/contracts/?finished=false") == {
        by_status[models.ContractStatus.draft],
        by_status[models.ContractStatus.active],
    }
    assert ids("/contracts/?finished=true") == {
        by_status[models.ContractStatus.expired],
        by_status[models.ContractStatus.terminated],
    }


def test_contracts_history_is_422_not_a_route(client, auth_client):
    auth_client(models.Role.staff)
    # QUIRK: /contracts/history ไม่ใช่ endpoint — ชน /contracts/{id} แล้ว int parse fail
    assert client.get("/contracts/history").status_code == 422


# ── run-expire ───────────────────────────────────────────────────────────────
def test_run_expire_only_active_past_end_date(client, auth_client, db):
    auth_client(models.Role.admin)
    past = TODAY - datetime.timedelta(days=1)
    make_contract(db, room_id=None, status=models.ContractStatus.active, end_date=past)
    make_contract(db, room_id=None, status=models.ContractStatus.active, end_date=TODAY)
    make_contract(db, room_id=None, status=models.ContractStatus.draft, end_date=past)

    res = client.post("/contracts/run-expire")
    assert res.status_code == 200
    assert res.json() == {"expired": 1}
    # idempotent
    assert client.post("/contracts/run-expire").json() == {"expired": 0}

    statuses = sorted(c.status.value for c in db.query(models.Contracts).all())
    assert statuses == ["active", "draft", "expired"]


def test_expire_contracts_script(db):
    from expire_contracts import run

    past = TODAY - datetime.timedelta(days=1)
    make_contract(db, room_id=None, status=models.ContractStatus.active, end_date=past)
    make_contract(db, room_id=None, status=models.ContractStatus.draft, end_date=past)

    assert run(db) == 1
    assert run(db) == 0  # idempotent
    statuses = sorted(c.status.value for c in db.query(models.Contracts).all())
    assert statuses == ["draft", "expired"]


# ── PUT / DELETE ─────────────────────────────────────────────────────────────
def test_put_terminate_is_admin_only(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    res = client.put(f"/contracts/{c.contract_id}", json={"status": "terminated"})
    assert res.status_code == 403
    assert res.json()["detail"] == "เฉพาะผู้ดูแลระบบยุติสัญญาได้"

    auth_client(models.Role.admin)
    res = client.put(f"/contracts/{c.contract_id}", json={"status": "terminated"})
    assert res.status_code == 200
    db.refresh(c)
    assert c.status == models.ContractStatus.terminated


def test_put_can_edit_terminated_contract(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.terminated)
    res = client.put(f"/contracts/{c.contract_id}", json={"rent": 9999})
    assert res.status_code == 200
    db.refresh(c)
    assert float(c.rent) == 9999


def test_checkout_checklist_by_staff_terminates_contract(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.active)
    # ตั้งใจ: check-out = สิ้นสุดกระบวนการเช่า → staff ยุติได้เลย ไม่ต้องรอ admin
    # (ต่างจาก PUT /contracts status=terminated ที่จำกัด admin)
    res = client.post(
        f"/contracts/{c.contract_id}/checklists",
        json={"type": "check-out", "items": []},
    )
    assert res.status_code == 200
    db.refresh(c)
    assert c.status == models.ContractStatus.terminated


def test_delete_contract_cascades_checklists_and_requests(client, auth_client, db):
    me = auth_client(models.Role.admin)
    c = make_contract(db, room_id=None)
    tenant_id = c.tenant_id
    db.add(
        models.ContractChecklist(
            contract_id=c.contract_id, type=models.ChecklistType.check_in
        )
    )
    db.add(
        models.ContractRequest(
            contract_id=c.contract_id,
            request_type=models.RequestType.renew,
            tenant_note="ขอต่อ",
            created_by=me.user_id,
        )
    )
    db.add(
        models.TenantDocument(tenant_id=tenant_id, doc_type="id", file_url="/uploads/x")
    )
    db.commit()

    assert client.delete(f"/contracts/{c.contract_id}").status_code == 200
    assert (
        db.query(models.ContractChecklist).filter_by(contract_id=c.contract_id).count()
        == 0
    )
    assert (
        db.query(models.ContractRequest).filter_by(contract_id=c.contract_id).count()
        == 0
    )
    # เอกสารผู้เช่าไม่ผูกกับ contract → ยังอยู่
    assert db.query(models.TenantDocument).filter_by(tenant_id=tenant_id).count() == 1
