import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import ChecklistEditor from "./ChecklistEditor";
import ConfirmDialog from "../../components/ConfirmDialog";

const typeLabel = {
  "check-in": "ตรวจรับเข้า (check-in)",
  "check-out": "ตรวจคืนห้อง (check-out)",
};

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

// normalize รายการให้ ChecklistEditor ใช้ได้ (ต้องมี photos เป็น array เสมอ)
const normItems = (items) =>
  (items ?? []).map((it) => ({
    name: "",
    status: "ปกติ",
    note: "",
    cost: 0,
    ...it,
    photos: it.photos ?? [],
  }));

const statusItemStyle = {
  ปกติ: "text-green-700",
  ชำรุด: "text-red-700",
  ต้องซ่อม: "text-amber-700",
};

// section บันทึกสภาพห้อง (checklists) ของสัญญา — ดู / แก้ / ลบ / เพิ่ม
function ChecklistSection({ contractId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  // editing = { cc_id?: number, type: string, items: [], signature: string, isNew: bool }
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiGet(`/contracts/${contractId}/checklists`);
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [contractId, tick]);

  function startEditExisting(row) {
    setEditing({
      cc_id: row.cc_id,
      type: row.type,
      items: normItems(row.checklist_items),
      signature: row.tenant_signature ?? "",
      isNew: false,
    });
  }

  function startAdd(type) {
    setEditing({ type, items: [], signature: "", isNew: true });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const items = editing.items.filter((r) => r.name.trim());
      const signature = editing.signature.trim() || null;
      if (editing.isNew) {
        await apiPost(`/contracts/${contractId}/checklists`, {
          type: editing.type,
          tenant_signature: signature,
          items,
        });
      } else {
        await apiPatch(
          `/contracts/${contractId}/checklists/${editing.cc_id}`,
          { type: editing.type, tenant_signature: signature, items }
        );
      }
      setEditing(null);
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteBusy(true);
    try {
      await apiDelete(
        `/contracts/${contractId}/checklists/${deleting.cc_id}`
      );
      setDeleting(null);
      reload();
    } catch (e) {
      alert(`ลบไม่สำเร็จ: ${e.message}`);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">บันทึกสภาพห้อง</h3>
        {!editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startAdd("check-in")}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              ＋ ตรวจรับเข้า
            </button>
            <button
              type="button"
              onClick={() => startAdd("check-out")}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              ＋ ตรวจคืนห้อง
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">กำลังโหลด...</p>}

      {!loading && !editing && rows.length === 0 && (
        <p className="text-sm text-gray-400">ยังไม่มีบันทึกสภาพห้อง</p>
      )}

      {/* โหมดแก้ไข / เพิ่ม */}
      {editing && (
        <div className="border border-blue-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="font-medium text-sm">
            {editing.isNew ? "เพิ่มบันทึก" : "แก้ไขบันทึก"} —{" "}
            {typeLabel[editing.type] ?? editing.type}
          </div>
          <ChecklistEditor
            value={editing.items}
            onChange={(items) => setEditing((s) => ({ ...s, items }))}
            showCost={editing.type === "check-out"}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">ชื่อผู้เช่าที่ร่วมตรวจ</span>
            <input
              value={editing.signature}
              onChange={(e) =>
                setEditing((s) => ({ ...s, signature: e.target.value }))
              }
              className={inputCls}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      )}

      {/* รายการที่มี */}
      {!editing &&
        rows.map((row) => (
          <div
            key={row.cc_id}
            className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {typeLabel[row.type] ?? row.type}
                <span className="text-gray-400 font-normal">
                  {" "}
                  · {formatDate(row.created_at)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditExisting(row)}
                  className="px-2 py-1 text-xs rounded text-blue-600 hover:bg-blue-50"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(row)}
                  className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50"
                >
                  ลบ
                </button>
              </div>
            </div>

            <ul className="text-sm flex flex-col gap-1">
              {normItems(row.checklist_items).map((it, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="w-32 shrink-0">{it.name}</span>
                  <span className={statusItemStyle[it.status] ?? "text-gray-500"}>
                    {it.status}
                  </span>
                  {it.note && <span className="text-gray-400">— {it.note}</span>}
                  {row.type === "check-out" && Number(it.cost) > 0 && (
                    <span className="text-red-700">
                      ({Number(it.cost).toLocaleString()} ฿)
                    </span>
                  )}
                </li>
              ))}
              {normItems(row.checklist_items).length === 0 && (
                <li className="text-gray-400">ไม่มีรายการ</li>
              )}
            </ul>

            {row.tenant_signature && (
              <div className="text-xs text-gray-400">
                ผู้ร่วมตรวจ: {row.tenant_signature}
              </div>
            )}
          </div>
        ))}

      {deleting && (
        <ConfirmDialog
          title="ลบบันทึกสภาพห้อง"
          message={`ลบบันทึก "${
            typeLabel[deleting.type] ?? deleting.type
          }" (${formatDate(deleting.created_at)}) ใช่หรือไม่?`}
          confirmText="ลบ"
          danger
          busy={deleteBusy}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

export default ChecklistSection;
