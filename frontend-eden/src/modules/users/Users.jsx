import { useMemo, useState } from "react";
import { formatDate } from "../../lib/datetime";
import { avatarSrc } from "../../lib/avatar";
import { useAuth } from "../../auth/AuthContext";
import { useUsers, useSetUserRole, useSetUserActive } from "../../data/users";
import { useTenants } from "../../data/tenants";
import ConfirmDialog from "../../components/ConfirmDialog";
import UserForm from "./UserForm";
import UserEditModal from "./UserEditModal";
import PasswordResetDialog from "./PasswordResetDialog";

const ROLE_LABEL = {
  tenant: "ผู้เช่า",
  staff: "พนักงาน",
  admin: "ผู้ดูแลระบบ",
};
// เปลี่ยนสิทธิ์ได้เฉพาะระหว่าง admin ↔ staff (บัญชี tenant ล็อก)
const ROLE_SWITCHABLE = [
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
  const { data: users = [], isPending: loading, error } = useUsers();
  const { data: tenants = [] } = useTenants();
  const setRole = useSetUserRole();
  const setUserActive = useSetUserActive();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [deactivating, setDeactivating] = useState(null);

  const rowBusy =
    setRole.isPending || setUserActive.isPending
      ? (setRole.variables?.id ?? setUserActive.variables?.id)
      : null;

  const tenantsByUser = useMemo(
    () => Object.fromEntries(tenants.map((t) => [t.user_id, t])),
    [tenants]
  );

  async function changeRole(u, role) {
    try {
      await setRole.mutateAsync({ id: u.user_id, role });
    } catch (e) {
      alert(`เปลี่ยน role ไม่สำเร็จ: ${e.message}`);
    }
  }

  async function setActive(u, is_active) {
    try {
      await setUserActive.mutateAsync({ id: u.user_id, is_active });
      setDeactivating(null);
    } catch (e) {
      alert(`อัปเดตสถานะไม่สำเร็จ: ${e.message}`);
    }
  }

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.user_id - b.user_id),
    [users]
  );

  return (
    <div className="p-2 flex flex-col gap-3 font-sans">
      <div className="flex justify-between">
        <div>
          <h2 className="text-3xl">จัดการผู้ใช้</h2>
          <p className="text-gray-500">
            บัญชีผู้ใช้ · role · สถานะ · รหัสผ่าน{" "}
            {!loading && `(${users.length})`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 h-fit"
        >
          เพิ่มผู้ใช้
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">สิทธิ์ (role)</th>
              <th className="px-4 py-3 font-medium">ผู้เช่า</th>
              <th className="px-4 py-3 font-medium text-center">สถานะ</th>
              <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
              <th className="px-4 py-3 font-medium text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  โหลดข้อมูลไม่สำเร็จ: {error.message}
                </td>
              </tr>
            )}

            {!loading && !error && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  ยังไม่มีผู้ใช้
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              sorted.map((u) => {
                const isMe = u.user_id === me?.user_id;
                const disabled = isMe || rowBusy === u.user_id;
                const tenant = tenantsByUser[u.user_id];
                return (
                  <tr
                    key={u.user_id}
                    className={`bg-white ${u.is_active ? "" : "opacity-50"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={avatarSrc(u)}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                        <span className="font-medium text-gray-900">
                          {u.username}
                        </span>
                        {isMe && (
                          <span className="text-xs text-gray-400">(คุณ)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "tenant" ? (
                        <span
                          title="บัญชีผู้เช่าเปลี่ยนสิทธิ์ไม่ได้"
                          className={`inline-block px-2 py-1 rounded text-sm ${
                            roleStyle.tenant
                          }`}
                        >
                          {ROLE_LABEL.tenant}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          disabled={disabled}
                          onChange={(e) => changeRole(u, e.target.value)}
                          className={`border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-400 ${
                            roleStyle[u.role] ?? ""
                          }`}
                        >
                          {ROLE_SWITCHABLE.map(([v, label]) => (
                            <option key={v} value={v}>
                              {label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tenant ? tenant.full_name : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={disabled}
                        onClick={() =>
                          u.is_active ? setDeactivating(u) : setActive(u, true)
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
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setEditing(u)}
                          className="px-2 py-1 text-xs rounded text-blue-600 hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => setResetting(u)}
                          className="px-2 py-1 text-xs rounded text-gray-600 hover:bg-gray-100"
                        >
                          ตั้งรหัสใหม่
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showForm && <UserForm onClose={() => setShowForm(false)} />}

      {editing && (
        <UserEditModal user={editing} onClose={() => setEditing(null)} />
      )}

      {resetting && (
        <PasswordResetDialog
          user={resetting}
          onClose={() => setResetting(null)}
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
