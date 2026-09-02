import { useEffect, useState } from "react";
import { useCreateUser } from "../../data/users";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

const ROLE_OPTIONS = [
  ["tenant", "ผู้เช่า"],
  ["staff", "พนักงาน"],
  ["admin", "ผู้ดูแลระบบ"],
];

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function UserForm({ onClose }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "staff",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createUser.mutateAsync({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      });
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
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
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">เพิ่มผู้ใช้</h3>
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
          <Field label="ชื่อผู้ใช้">
            <input
              required
              value={form.username}
              onChange={set("username")}
              className={inputCls}
            />
          </Field>
          <Field label="รหัสผ่าน">
            <input
              required
              type="password"
              value={form.password}
              onChange={set("password")}
              className={inputCls}
            />
          </Field>
          <Field label="สิทธิ์ (role)">
            <select
              value={form.role}
              onChange={set("role")}
              className={inputCls}
            >
              {ROLE_OPTIONS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
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
              disabled={busy}
              className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserForm;
