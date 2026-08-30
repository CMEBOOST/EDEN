import { useEffect } from "react";

function ConfirmDialog({
  title = "ยืนยัน",
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600 whitespace-pre-line">{message}</p>

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm rounded text-white disabled:opacity-50 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {busy ? "กำลังดำเนินการ..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
