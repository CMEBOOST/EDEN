import { useEffect, useState } from "react";
import { useSetUserPassword } from "../../data/users";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

function PasswordResetDialog({ user, onClose }) {
  const setPassword = useSetUserPassword();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pw.length < 6) {
      setError("รหัสผ่านอย่างน้อย 6 ตัว");
      return;
    }
    if (pw !== pw2) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setPassword.mutateAsync({ id: user.user_id, new_password: pw });
      alert(`ตั้งรหัสผ่านใหม่ให้ "${user.username}" แล้ว`);
      onClose?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
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
        <h3 className="text-lg font-semibold">
          ตั้งรหัสผ่านใหม่ · {user.username}
        </h3>
        <p className="text-xs text-gray-400">
          admin ตั้งรหัสใหม่ให้โดยตรง — แจ้งรหัสนี้ให้ผู้ใช้เอง
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">รหัสผ่านใหม่</span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">ยืนยันรหัสผ่านใหม่</span>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
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
              disabled={busy}
              className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก..." : "ตั้งรหัสผ่าน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordResetDialog;
