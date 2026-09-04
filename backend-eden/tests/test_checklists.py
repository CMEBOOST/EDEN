"""characterization: /contracts/{id}/checklists — CRUD + check-out side effect"""

from app.models import models
from tests.factories import make_contract


def test_post_missing_contract_404(client, auth_client):
    auth_client(models.Role.staff)
    assert (
        client.post("/contracts/999999/checklists", json={"items": []}).status_code
        == 404
    )


def test_default_type_is_check_in(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None)
    res = client.post(f"/contracts/{c.contract_id}/checklists", json={"items": []})
    assert res.status_code == 200
    assert res.json()["type"] == "check-in"


def test_items_store_cost_photos_flattened(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None)
    res = client.post(
        f"/contracts/{c.contract_id}/checklists",
        json={
            "type": "check-out",
            "items": [
                {"name": "แอร์", "cost": 500, "photos": ["/uploads/a.png"]},
                {
                    "name": "พัดลม",
                    "cost": 0,
                    "photos": ["/uploads/b.png", "/uploads/c.png"],
                },
            ],
        },
    )
    body = res.json()
    # cost เก็บใน checklist_items — รวมเป็น damage_total ตอนปิด request terminate
    # (ดู test_requests.py::test_complete_terminate_sets_status_and_sums_damage)
    assert body["checklist_items"][0]["cost"] == 500
    assert body["photo_urls"] == ["/uploads/a.png", "/uploads/b.png", "/uploads/c.png"]


def test_checkout_flips_draft_or_active_to_terminated(client, auth_client, db):
    auth_client(models.Role.staff)
    for st in (models.ContractStatus.draft, models.ContractStatus.active):
        c = make_contract(db, room_id=None, status=st)
        client.post(
            f"/contracts/{c.contract_id}/checklists",
            json={"type": "check-out", "items": []},
        )
        db.refresh(c)
        assert c.status == models.ContractStatus.terminated


def test_checkout_leaves_expired_status_untouched(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.expired)
    res = client.post(
        f"/contracts/{c.contract_id}/checklists",
        json={"type": "check-out", "items": []},
    )
    assert res.status_code == 200
    db.refresh(c)
    assert c.status == models.ContractStatus.expired


def test_multiple_checkout_checklists_allowed(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None, status=models.ContractStatus.expired)
    for _ in range(2):
        assert (
            client.post(
                f"/contracts/{c.contract_id}/checklists",
                json={"type": "check-out", "items": []},
            ).status_code
            == 200
        )
    assert (
        db.query(models.ContractChecklist).filter_by(contract_id=c.contract_id).count()
        == 2
    )


def test_patch_delete_require_matching_contract_id(client, auth_client, db):
    auth_client(models.Role.staff)
    c1 = make_contract(db, room_id=None)
    c2 = make_contract(db, room_id=None)
    cc = models.ContractChecklist(
        contract_id=c1.contract_id, type=models.ChecklistType.check_in
    )
    db.add(cc)
    db.commit()
    # cc_id ถูก แต่ contract_id ใน path ผิด → 404
    assert (
        client.patch(
            f"/contracts/{c2.contract_id}/checklists/{cc.cc_id}", json={}
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/contracts/{c2.contract_id}/checklists/{cc.cc_id}").status_code
        == 404
    )
    # ถูกทั้งคู่ → ok
    assert (
        client.delete(f"/contracts/{c1.contract_id}/checklists/{cc.cc_id}").status_code
        == 200
    )


def test_patch_none_signature_is_ignored(client, auth_client, db):
    auth_client(models.Role.staff)
    c = make_contract(db, room_id=None)
    cc = models.ContractChecklist(
        contract_id=c.contract_id,
        type=models.ChecklistType.check_in,
        tenant_signature="sig",
    )
    db.add(cc)
    db.commit()
    # tenant_signature=None ใน body → ไม่แตะ (ใช้ `is not None` ไม่ใช่ exclude_unset)
    client.patch(
        f"/contracts/{c.contract_id}/checklists/{cc.cc_id}",
        json={"tenant_signature": None},
    )
    db.refresh(cc)
    assert cc.tenant_signature == "sig"
