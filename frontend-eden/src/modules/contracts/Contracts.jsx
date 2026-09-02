import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiDelete } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import { useAuth } from "../../auth/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import RequestPanel from "../requests/RequestPanel";

// status ตรงกับ contract_status_enum ใน backend
const statusStyle = {
  draft: "bg-gray-100 text-gray-500",
  active: "bg-green-100 text-green-700",
  expired: "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
};

const statusLabel = {
  draft: "ร่าง",
  active: "ใช้งาน",
  expired: "หมดอายุ",
  terminated: "ยกเลิก",
};

function Contracts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [contracts, setContracts] = useState([]);
  const [tenantsById, setTenantsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  async function handleDelete() {
    setDeleteBusy(true);
    try {
      await apiDelete(`/contracts/${deleting.contract_id}`);
      setContracts((prev) =>
        prev.filter((c) => c.contract_id !== deleting.contract_id)
      );
      setDeleting(null);
    } catch (e) {
      alert(`ลบไม่สำเร็จ: ${e.message}`);
    } finally {
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [contractList, tenantList] = await Promise.all([
          apiGet("/contracts/?finished=false"),
          apiGet("/tenants/"),
        ]);
        if (cancelled) return;
        setContracts(contractList);
        setTenantsById(
          Object.fromEntries(tenantList.map((t) => [t.tenant_id, t]))
        );
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const tenantName = (id) => tenantsById[id]?.full_name ?? `#${id}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter(
      (c) =>
        String(c.room_id ?? "").toLowerCase().includes(q) ||
        tenantName(c.tenant_id).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, tenantsById, search]);

  return (
    <div className="p-2 flex flex-col gap-3 font-sans">
      <div className="flex justify-between">
        <div>
          <h2 className="text-3xl">สัญญาเช่า</h2>
          <p className="text-gray-500">
            ห้องเช่าทั้งหมด {!loading && `(${contracts.length})`}
          </p>
        </div>
        <div className="flex gap-2 items-center h-fit">
          <button
            onClick={() => navigate("/contracts/history")}
            className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            ประวัติสัญญาเช่า
          </button>
          <button
            onClick={() => navigate("/contracts/new")}
            className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            เพิ่มสัญญา
          </button>
        </div>
      </div>

      <RequestPanel onActioned={reload} />

      <div className="bg-gray-50 flex p-2 justify-start items-center rounded">
        <input
          type="text"
          name="search"
          placeholder="ค้นหาเลขห้อง ผู้เช่า"
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
              <th className="px-4 py-3 font-medium">ห้อง</th>
              <th className="px-4 py-3 font-medium">ผู้เช่า</th>
              <th className="px-4 py-3 font-medium">เริ่มสัญญา</th>
              <th className="px-4 py-3 font-medium">สิ้นสุดสัญญา</th>
              <th className="px-4 py-3 font-medium text-right">ค่าเช่า/เดือน</th>
              <th className="px-4 py-3 font-medium text-center">สถานะ</th>
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
                  โหลดข้อมูลไม่สำเร็จ: {error}
                </td>
              </tr>
            )}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  ยังไม่มีสัญญา
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filtered.map((c) => (
                <tr
                  key={c.contract_id}
                  onClick={() => navigate(`/contracts/${c.contract_id}`)}
                  className="bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.room_id ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {tenantName(c.tenant_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(c.start_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(c.end_date)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {Number(c.rent).toLocaleString()} ฿
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusStyle[c.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/contracts/${c.contract_id}`);
                        }}
                        className="px-2 py-1 text-xs rounded text-blue-600 hover:bg-blue-50"
                      >
                        รายละเอียด
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(c);
                          }}
                          className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {deleting && (
        <ConfirmDialog
          title="ลบสัญญา"
          message={`ต้องการลบสัญญา #${deleting.contract_id} (${tenantName(
            deleting.tenant_id
          )}) ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`}
          confirmText="ลบ"
          danger
          busy={deleteBusy}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default Contracts;
