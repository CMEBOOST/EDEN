import { useEffect, useState } from "react";
import { apiPut, apiUpload, fileUrl } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import FileDropField from "../../components/FileDropField";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

const STATUS_OPTIONS = [
  ["draft", "ร่าง"],
  ["active", "ใช้งาน"],
  ["expired", "หมดอายุ"],
  ["terminated", "ยกเลิก"],
];

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function ContractEditForm({ contract, onClose, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState({
    room_id: contract.room_id ?? "",
    start_date: contract.start_date ?? "",
    end_date: contract.end_date ?? "",
    rent: String(contract.rent ?? ""),
    security_deposit: String(contract.security_deposit ?? ""),
    status: contract.status ?? "draft",
    special_conditions: contract.special_conditions ?? "",
  });
  const [newFile, setNewFile] = useState(null); // ไฟล์สัญญาใหม่ (ถ้าเปลี่ยน)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

      const updated = await apiPut(`/contracts/${contract.contract_id}`, {
        room_id: form.room_id ? Number(form.room_id) : null,
        start_date: form.start_date,
        end_date: form.end_date,
        rent: Number(form.rent),
        security_deposit: Number(form.security_deposit),
        status: form.status,
        special_conditions: form.special_conditions.trim() || null,
        contract_file_url: contractFileUrl,
      });
      onSaved?.(updated);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            แก้ไขสัญญา #{contract.contract_id}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="เลขห้อง">
              <input
                value={form.room_id}
                onChange={set("room_id")}
                className={inputCls}
                inputMode="numeric"
              />
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

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
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
      </div>
    </div>
  );
}

export default ContractEditForm;
