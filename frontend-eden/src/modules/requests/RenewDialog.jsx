import { useEffect, useState } from "react";
import { formatDate } from "../../lib/datetime";
import { useUpdateRequest } from "../../data/requests";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

// รับเรื่องต่อสัญญา — ปิดคำขอ (completed) แล้ว backend ขยาย end_date ของสัญญาให้
function RenewDialog({ request, onClose }) {
  const updateRequest = useUpdateRequest();
  const currentEnd = request.contract_end_date;
  const [endDate, setEndDate] = useState(request.preferred_date || "");
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
    if (!endDate) {
      setError("กรุณาระบุวันสิ้นสุดใหม่");
      return;
    }
    if (currentEnd && endDate <= currentEnd) {
      setError("วันสิ้นสุดใหม่ต้องหลังวันสิ้นสุดเดิม");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateRequest.mutateAsync({
        id: request.request_id,
        body: {
          status: "completed",
          preferred_date: endDate,
          staff_note: note.trim() || null,
        },
      });
      onClose?.();
    } catch (err) {
      setError(err.message);
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
          <h3 className="text-lg font-semibold">
            ต่อสัญญา · {request.tenant_name}
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

        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-line">
          {request.tenant_note}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="text-sm text-gray-500">
            วันสิ้นสุดเดิม: {formatDate(currentEnd)}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              วันสิ้นสุดใหม่ <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">หมายเหตุเจ้าหน้าที่</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
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
              {submitting ? "กำลังบันทึก..." : "ยืนยันต่อสัญญา"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RenewDialog;
