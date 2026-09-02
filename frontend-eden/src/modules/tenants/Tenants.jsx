import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../lib/datetime";
import { useAuth } from "../../auth/AuthContext";
import { useTenants, useDeactivateTenant } from "../../data/tenants";
import TenantForm from "./TenantForm";
import ConfirmDialog from "../../components/ConfirmDialog";

function Tenants() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: tenants = [], isPending: loading, error } = useTenants();
  const deactivate = useDeactivateTenant();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null); // ผู้เช่าที่กำลังจะปิดใช้งาน

  async function handleDelete() {
    try {
      await deactivate.mutateAsync(deleting.tenant_id);
      setDeleting(null);
    } catch (e) {
      alert(`ปิดใช้งานไม่สำเร็จ: ${e.message}`);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        (t.full_name ?? "").toLowerCase().includes(q) ||
        (t.phone ?? "").toLowerCase().includes(q) ||
        (t.email ?? "").toLowerCase().includes(q)
    );
  }, [tenants, search]);

  return (
    <div className="p-2 flex flex-col gap-3 font-sans">
      <div className="flex justify-between">
        <div>
          <h2 className="text-3xl">ผู้เช่า</h2>
          <p className="text-gray-500">
            ผู้เช่าทั้งหมด {!loading && `(${tenants.length})`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 h-fit"
        >
          เพิ่มผู้เช่า
        </button>
      </div>

      {showForm && (
        <TenantForm tenant={null} onClose={() => setShowForm(false)} />
      )}

      {deleting && (
        <ConfirmDialog
          title="ปิดการใช้งานผู้เช่า"
          message={`ปิดการใช้งาน "${deleting.full_name}" ? บัญชีผู้ใช้จะเข้าสู่ระบบไม่ได้ (ข้อมูลยังเก็บไว้)`}
          confirmText="ปิดใช้งาน"
          danger
          busy={deactivate.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      <div className="bg-gray-50 flex p-2 justify-start items-center rounded">
        <input
          type="text"
          name="search"
          placeholder="ค้นหาชื่อ เบอร์โทร อีเมล"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none w-full"
        />
      </div>

      {/* ตาราง */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">ชื่อ-สกุล</th>
              <th className="px-4 py-3 font-medium">เบอร์โทร</th>
              <th className="px-4 py-3 font-medium">อีเมล</th>
              <th className="px-4 py-3 font-medium">ที่อยู่</th>
              <th className="px-4 py-3 font-medium">ผู้ติดต่อฉุกเฉิน</th>
              <th className="px-4 py-3 font-medium">เพิ่มเมื่อ</th>
              <th className="px-4 py-3 font-medium text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}

            {error && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-red-600">
                  โหลดข้อมูลไม่สำเร็จ: {error.message}
                </td>
              </tr>
            )}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  ยังไม่มีผู้เช่า
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filtered.map((t) => (
                <tr
                  key={t.tenant_id}
                  onClick={() => navigate(`/tenants/${t.tenant_id}`)}
                  className="bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {t.full_name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t.phone || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{t.email || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.current_address || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.emergency_contact || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(t.created_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tenants/${t.tenant_id}`);
                        }}
                        className="px-2 py-1 text-xs rounded text-blue-600 hover:bg-blue-50"
                      >
                        รายละเอียด
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(t);
                          }}
                          className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50"
                        >
                          ปิดใช้งาน
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Tenants;
