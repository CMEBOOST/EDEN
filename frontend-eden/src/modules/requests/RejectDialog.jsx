import { useEffect, useState } from "react";
import { apiPatch } from "../../lib/api";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

// ปฏิเสธคำแจ้งความจำนง — ต้องระบุเหตุผล
function RejectDialog({ request, onClose, onActioned }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("กรุณาระบุเหตุผล");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiPatch(`/contract-requests/${request.request_id}`, {
        status: "rejected",
        staff_note: reason.trim(),
      });
      onActioned?.();
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
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">ปฏิเสธคำแจ้ง · {request.tenant_name}</h3>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">
              เหตุผล <span className="text-red-500">*</span>
            </span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : "ปฏิเสธ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RejectDialog;
