import { useEffect, useState } from "react";
import { apiPost } from "../../lib/api";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

// แจ้งความจำนงล่วงหน้า — ผู้เช่าแจ้งว่าจะต่อหรือยุติสัญญา
function IntentNoticeDialog({ contractId, onClose, onDone }) {
  const [type, setType] = useState("renew");
  const [preferredDate, setPreferredDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!note.trim()) {
      setError("กรุณากรอกรายละเอียด");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/contract-requests/", {
        contract_id: contractId,
        request_type: type,
        tenant_note: note.trim(),
        preferred_date: preferredDate || null,
      });
      onDone?.();
      onClose?.();
    } catch (err) {
      setError(
        err.status === 409
          ? "มีคำแจ้งความจำนงที่ยังไม่ดำเนินการอยู่แล้ว"
          : err.message
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">แจ้งความจำนงล่วงหน้า</h3>
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
          <div className="flex gap-2">
            {[
              ["renew", "ต่อสัญญาเช่า"],
              ["terminate", "ยุติสัญญาเช่า"],
            ].map(([v, label]) => (
              <label
                key={v}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm cursor-pointer text-center ${
                  type === v
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="request_type"
                  value={v}
                  checked={type === v}
                  onChange={() => setType(v)}
                  className="hidden"
                />
                {label}
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              {type === "renew"
                ? "วันสิ้นสุดสัญญาใหม่ที่ต้องการ"
                : "วันที่ต้องการย้ายออก"}
            </span>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              รายละเอียด (ลายลักษณ์อักษร) <span className="text-red-500">*</span>
            </span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
              placeholder="เช่น ต้องการต่อสัญญาอีก 1 ปี / แจ้งยุติสัญญาเนื่องจากย้ายที่ทำงาน"
            />
          </label>

          <div className="flex justify-end gap-2 mt-1">
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
              {submitting ? "กำลังส่ง..." : "ส่งคำแจ้ง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IntentNoticeDialog;
