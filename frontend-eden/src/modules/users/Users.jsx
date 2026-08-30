import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import { useAuth } from "../../auth/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import UserForm from "./UserForm";

const ROLE_OPTIONS = [
  ["tenant", "ผู้เช่า"],
  ["staff", "พนักงาน"],
  ["admin", "ผู้ดูแลระบบ"],
];
const roleStyle = {
  admin: "bg-purple-100 text-purple-700",
  staff: "bg-blue-100 text-blue-700",
  tenant: "bg-gray-100 text-gray-600",
};

function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowBusy, setRowBusy] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deactivating, setDeactivating] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet("/users/");
        if (!cancelled) setUsers(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceRow = (u) =>
    setUsers((prev) => prev.map((x) => (x.user_id === u.user_id ? u : x)));

  async function changeRole(u, role) {
    setRowBusy(u.user_id);
    try {
      replaceRow(await apiPatch(`/users/${u.user_id}/role`, { role }));
    } catch (e) {
      alert(`เปลี่ยน role ไม่สำเร็จ: ${e.message}`);
    } finally {
      setRowBusy(null);
    }
  }

  async function setActive(u, is_active) {
    setRowBusy(u.user_id);
    try {
      replaceRow(await apiPatch(`/users/${u.user_id}`, { is_active }));
      setDeactivating(null);
    } catch (e) {
      alert(`อัปเดตสถานะไม่สำเร็จ: ${e.message}`);
    } finally {
      setRowBusy(null);
    }
  }

  return (
    <div className="p-2 flex flex-col gap-3 font-sans">
      <div className="flex justify-between">
        <div>
          <h2 className="text-3xl">จัดการสิทธิ์</h2>
          <p className="text-gray-500">
            ปรับ role และเปิด/ปิดการใช้งานผู้ใช้ {!loading && `(${users.length})`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 bg-blue-500 rounded text-gray-100 hover:bg-blue-600"
        >
          เพิ่มผู้ใช้
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">ชื่อผู้ใช้</th>
              <th className="px-4 py-3 font-medium">สิทธิ์ (role)</th>
              <th className="px-4 py-3 font-medium text-center">สถานะ</th>
              <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              users.map((u) => {
                const isMe = u.user_id === me?.user_id;
                const disabled = isMe || rowBusy === u.user_id;
                return (
                  <tr
                    key={u.user_id}
                    className={`bg-white ${u.is_active ? "" : "opacity-50"}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.username}
                      {isMe && (
                        <span className="ml-2 text-xs text-gray-400">(คุณ)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={disabled}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className={`border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-400 ${
                          roleStyle[u.role] ?? ""
                        }`}
                      >
                        {ROLE_OPTIONS.map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={disabled}
                        onClick={() =>
                          u.is_active
                            ? setDeactivating(u)
                            : setActive(u, true)
                        }
                        className={`px-2.5 py-1 rounded-full text-xs font-medium disabled:opacity-40 ${
                          u.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {u.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserForm
          onClose={() => setShowForm(false)}
          onCreated={(u) => setUsers((prev) => [...prev, u])}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="ปิดการใช้งานผู้ใช้"
          message={`ปิดการใช้งาน "${deactivating.username}" ? ผู้ใช้จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใหม่`}
          confirmText="ปิดการใช้งาน"
          danger
          busy={rowBusy === deactivating.user_id}
          onConfirm={() => setActive(deactivating, false)}
          onClose={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}

export default Users;
