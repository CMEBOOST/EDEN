import { useEffect, useState } from "react";
import { apiPost, apiPut } from "../../lib/api";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

const TYPE_OPTIONS = [
  ["water", "ค่าน้ำ"],
  ["electric", "ค่าไฟ"],
];

const today = () => new Date().toISOString().slice(0, 10);

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

// rate = null -> เพิ่ม, rate = object -> แก้ไข
function RateForm({ rate, onClose, onSaved, onEditExisting }) {
  const isEdit = Boolean(rate);
  const [form, setForm] = useState({
    type: rate?.type ?? "water",
    rate_value: String(rate?.rate_value ?? ""),
    effective_date: rate?.effective_date ?? today(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [conflictId, setConflictId] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (e) => {
    setConflictId(null);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setConflictId(null);
    try {
      const body = {
        type: form.type,
        rate_value: Number(form.rate_value),
        effective_date: form.effective_date,
      };
      const saved = isEdit
        ? await apiPut(`/rates/${rate.rate_id}`, body)
        : await apiPost("/rates/", body);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      if (err.status === 409) {
        setError(err.detail?.message ?? "มีอัตราประเภทนี้สำหรับวันที่นี้อยู่แล้ว");
        setConflictId(err.detail?.existing_rate_id ?? null);
      } else {
        setError(err.message);
      }
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
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            {isEdit ? "แก้ไขอัตราค่าบริการ" : "เพิ่มอัตราค่าบริการ"}
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
          <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2 flex flex-col gap-1">
            <span>{error}</span>
            {conflictId && onEditExisting && (
              <button
                type="button"
                onClick={() => onEditExisting(conflictId)}
                className="text-blue-600 hover:underline text-left"
              >
                → ไปแก้แถวเดิม
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="ประเภท">
            <select
              value={form.type}
              onChange={set("type")}
              className={inputCls}
              disabled={isEdit}
            >
              {TYPE_OPTIONS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="เรท (บาท/หน่วย)">
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.rate_value}
              onChange={set("rate_value")}
              className={inputCls}
            />
          </Field>

          <Field label="มีผลตั้งแต่วันที่">
            <input
              type="date"
              required
              value={form.effective_date}
              onChange={set("effective_date")}
              className={inputCls}
            />
            <span className="text-xs text-gray-400">
              ตั้งวันในอนาคตได้ = ตั้งเรทล่วงหน้า
            </span>
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

export default RateForm;
