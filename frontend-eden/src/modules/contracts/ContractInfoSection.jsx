import { useState } from "react";
import { apiUpload, fileUrl } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import { useAuth } from "../../auth/AuthContext";
import { useRooms } from "../../data/rooms";
import { useUpdateContract } from "../../data/contracts";
import FileDropField from "../../components/FileDropField";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

const STATUS_OPTIONS = [
  ["draft", "ร่าง"],
  ["active", "ใช้งาน"],
  ["expired", "หมดอายุ"],
  ["terminated", "ยกเลิก"],
];
const statusLabel = Object.fromEntries(STATUS_OPTIONS);

const fmtBaht = (n) => Number(n ?? 0).toLocaleString();

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800">{children}</span>
    </div>
  );
}

// section ข้อมูลสัญญา — โหมดดู + สลับเป็นโหมดแก้ (PUT /contracts/{id})
// readOnly = ดูอย่างเดียว (หน้าประวัติ) — ซ่อนปุ่มแก้ไข
function ContractInfoSection({ contract, readOnly = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const updateContract = useUpdateContract();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // โหลดรายการห้องเฉพาะตอนกดแก้ไข
  const { data: rooms = [] } = useRooms({ enabled: editing });

  function startEdit() {
    setForm({
      room_id: contract.room_id ?? "",
      start_date: contract.start_date ?? "",
      end_date: contract.end_date ?? "",
      rent: String(contract.rent ?? ""),
      security_deposit: String(contract.security_deposit ?? ""),
      status: contract.status ?? "draft",
      special_conditions: contract.special_conditions ?? "",
    });
    setNewFile(null);
    setError(null);
    setEditing(true);
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.end_date < form.start_date) {
      setError("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let contractFileUrl = contract.contract_file_url ?? null;
      if (newFile) contractFileUrl = (await apiUpload(newFile)).url;

      await updateContract.mutateAsync({
        id: contract.contract_id,
        body: {
          room_id: form.room_id ? Number(form.room_id) : null,
          start_date: form.start_date,
          end_date: form.end_date,
          rent: Number(form.rent),
          security_deposit: Number(form.security_deposit),
          status: form.status,
          special_conditions: form.special_conditions.trim() || null,
          contract_file_url: contractFileUrl,
        },
      });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">ข้อมูลสัญญา</h3>
        {!editing && !readOnly && (
          <button
            type="button"
            onClick={startEdit}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            แก้ไข
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {!editing ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Row label="ห้อง">{contract.room_id ?? "-"}</Row>
            <Row label="สถานะ">{statusLabel[contract.status] ?? contract.status}</Row>
            <Row label="ค่าเช่า/เดือน">{fmtBaht(contract.rent)} ฿</Row>
            <Row label="วันเริ่มสัญญา">{formatDate(contract.start_date)}</Row>
            <Row label="วันสิ้นสุดสัญญา">{formatDate(contract.end_date)}</Row>
            <Row label="เงินประกัน">{fmtBaht(contract.security_deposit)} ฿</Row>
          </div>
          <Row label="เงื่อนไขพิเศษ">
            {contract.special_conditions || "-"}
          </Row>
          <Row label="ไฟล์สัญญา">
            {contract.contract_file_url ? (
              <a
                href={fileUrl(contract.contract_file_url)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                📄 เปิดดูไฟล์สัญญา
              </a>
            ) : (
              "- ยังไม่มีไฟล์"
            )}
          </Row>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ห้อง">
              <select
                value={form.room_id}
                onChange={set("room_id")}
                className={inputCls}
              >
                <option value="">— ไม่ระบุห้อง —</option>
                {rooms
                  .filter(
                    (r) =>
                      r.status === "available" ||
                      String(r.room_id) === String(contract.room_id)
                  )
                  .map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_id} · ชั้น {r.floor} ·{" "}
                      {Number(r.base_rent).toLocaleString()} ฿
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="สถานะ">
              <select
                value={form.status}
                onChange={set("status")}
                className={inputCls}
              >
                {STATUS_OPTIONS.map(([v, label]) => (
                  <option
                    key={v}
                    value={v}
                    disabled={v === "terminated" && !isAdmin}
                  >
                    {label}
                    {v === "terminated" && !isAdmin ? " (เฉพาะ admin)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="วันเริ่มสัญญา">
              <input
                type="date"
                value={form.start_date}
                onChange={set("start_date")}
                className={inputCls}
              />
            </Field>
            <Field label="วันสิ้นสุดสัญญา">
              <input
                type="date"
                value={form.end_date}
                onChange={set("end_date")}
                className={inputCls}
              />
            </Field>
            <Field label="ค่าเช่า/เดือน (บาท)">
              <input
                type="number"
                min="0"
                value={form.rent}
                onChange={set("rent")}
                className={inputCls}
              />
            </Field>
            <Field label="เงินประกัน (บาท)">
              <input
                type="number"
                min="0"
                value={form.security_deposit}
                onChange={set("security_deposit")}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="เงื่อนไขพิเศษ">
            <textarea
              rows={2}
              value={form.special_conditions}
              onChange={set("special_conditions")}
              className={inputCls}
            />
          </Field>

          <Field label="ไฟล์สัญญา">
            {contract.contract_file_url && !newFile && (
              <a
                href={fileUrl(contract.contract_file_url)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline text-sm mb-1"
              >
                📄 ไฟล์ปัจจุบัน (เปิดดู)
              </a>
            )}
            <FileDropField value={newFile} onChange={setNewFile} />
          </Field>

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default ContractInfoSection;
