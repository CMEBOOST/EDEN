import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../lib/datetime";
import { useContracts } from "../../data/contracts";
import { useTenants } from "../../data/tenants";

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

// หน้าประวัติสัญญาเช่า — เฉพาะสัญญาที่สิ้นสุดแล้ว (status = หมดอายุ / ยกเลิก)
function ContractHistory() {
  const navigate = useNavigate();
  const {
    data: contracts = [],
    isPending: loading,
    error,
  } = useContracts({ finished: true });
  const { data: tenantList = [] } = useTenants();
  const [search, setSearch] = useState("");

  const tenantsById = useMemo(
    () => Object.fromEntries(tenantList.map((t) => [t.tenant_id, t])),
    [tenantList]
  );

  const tenantName = (id) => tenantsById[id]?.full_name ?? `#${id}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter(
      (c) =>
        String(c.room_id ?? "")
          .toLowerCase()
          .includes(q) || tenantName(c.tenant_id).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, tenantsById, search]);

  return (
    <div className="p-2 flex flex-col gap-3 font-sans">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/contracts")}
          className="text-gray-500 hover:text-gray-800"
        >
          ← กลับ
        </button>
        <div>
          <h2 className="text-3xl">ประวัติสัญญาเช่า</h2>
          <p className="text-gray-500">
            สัญญาที่สิ้นสุดแล้ว (หมดอายุ / ยกเลิก){" "}
            {!loading && `(${contracts.length})`}
          </p>
        </div>
      </div>

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

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">ห้อง</th>
              <th className="px-4 py-3 font-medium">ผู้เช่า</th>
              <th className="px-4 py-3 font-medium">เริ่มสัญญา</th>
              <th className="px-4 py-3 font-medium">สิ้นสุดสัญญา</th>
              <th className="px-4 py-3 font-medium text-right">
                ค่าเช่า/เดือน
              </th>
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
                  โหลดข้อมูลไม่สำเร็จ: {error.message}
                </td>
              </tr>
            )}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  ยังไม่มีสัญญาที่เสร็จสิ้น
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filtered.map((c) => (
                <tr
                  key={c.contract_id}
                  onClick={() =>
                    navigate(`/contracts/history/${c.contract_id}`)
                  }
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contracts/history/${c.contract_id}`);
                      }}
                      className="px-2 py-1 text-xs rounded text-blue-600 hover:bg-blue-50"
                    >
                      ดูประวัติ
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ContractHistory;
