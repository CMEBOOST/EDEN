import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logoEden from "../../assets/logoEden.webp";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username.trim(), form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.status === 401 ? "username หรือรหัสผ่านไม่ถูกต้อง" : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <div className="text-center">
          <img
            src={logoEden}
            alt="EDEN PLACE"
            className="inline-block h-14 w-auto rounded-lg object-contain"
          />
          <p className="text-gray-500 text-sm mt-3">เข้าสู่ระบบจัดการหอพัก</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">ชื่อผู้ใช้</span>
          <input
            required
            autoFocus
            value={form.username}
            onChange={set("username")}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">รหัสผ่าน</span>
          <input
            required
            type="password"
            value={form.password}
            onChange={set("password")}
            className={inputCls}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}

export default Login;
