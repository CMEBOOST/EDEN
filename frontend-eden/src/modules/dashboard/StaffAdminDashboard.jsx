import { Link } from "react-router-dom";
import { formatDate } from "../../lib/datetime";
import { useRequests } from "../../data/requests";
import StatCard from "../../components/StatCard";
import Card from "../../components/Card";
import { typeLabel } from "../requests/requestMeta";
import NewContractsChart from "./charts/NewContractsChart";
import ContractStatusDonut from "./charts/ContractStatusDonut";

const fmtBaht = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

const todayLabel = () => formatDate(new Date().toISOString());

function daysBadge(d) {
  if (d <= 7) return "bg-red-100 text-red-700";
  if (d <= 15) return "bg-orange-100 text-orange-700";
  return "bg-amber-100 text-amber-700";
}

function ExpiringTable({ rows }) {
  return (
    <table className="w-full text-sm text-left">
      <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
        <tr>
          <th className="px-4 py-2 font-medium">ผู้เช่า</th>
          <th className="px-4 py-2 font-medium">ห้อง</th>
          <th className="px-4 py-2 font-medium">สิ้นสุด</th>
          <th className="px-4 py-2 font-medium text-center">เหลือ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
              ไม่มีสัญญาใกล้หมดอายุ
            </td>
          </tr>
        )}
        {rows.map((e) => (
          <tr key={e.contract_id} className="bg-white">
            <td className="px-4 py-2.5">{e.tenant_name}</td>
            <td className="px-4 py-2.5 text-gray-500">{e.room_id ?? "-"}</td>
            <td className="px-4 py-2.5 text-gray-500">
              {formatDate(e.end_date)}
            </td>
            <td className="px-4 py-2.5 text-center">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${daysBadge(
                  e.days_left
                )}`}
              >
                {e.days_left} วัน
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PendingRequestsPanel() {
  const { data: requests = [], isPending, error } = useRequests("pending");

  return (
    <Card
      title="คำขอรอดำเนินการ"
      bodyClassName=""
      action={
        <Link
          to="/contracts"
          className="text-xs text-blue-600 hover:underline font-normal"
        >
          ดูทั้งหมด →
        </Link>
      }
    >
      {isPending && (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">
          กำลังโหลด...
        </div>
      )}
      {error && (
        <div className="px-4 py-6 text-center text-red-600 text-sm">
          โหลดไม่สำเร็จ
        </div>
      )}
      {!isPending && !error && requests.length === 0 && (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">
          ไม่มีคำขอค้าง
        </div>
      )}
      {!isPending && !error && requests.length > 0 && (
        <ul className="divide-y divide-gray-100 text-sm">
          {requests.map((r) => (
            <li
              key={r.request_id}
              className="px-4 py-2.5 flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-medium shrink-0">
                  {typeLabel[r.request_type] ?? r.request_type}
                </span>
                <span className="text-gray-500 truncate">
                  {r.tenant_name}
                  {r.room_id ? ` · ${r.room_id}` : ""}
                </span>
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {formatDate(r.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StaffAdminDashboard({ data }) {
  const {
    counts,
    expiring = [],
    monthly_rent_total,
    occupancy_rate = 0,
    status_breakdown = {},
    new_contracts_monthly = [],
  } = data;

  return (
    <div className="flex flex-col gap-5 font-sans">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-3xl">ภาพรวม</h2>
        <span className="text-sm text-gray-400">{todayLabel()}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="ผู้เช่าทั้งหมด" value={counts.tenants} />
        <StatCard label="สัญญาที่ใช้งาน" value={counts.contracts_active} />
        <StatCard
          label="ห้องว่าง"
          value={
            <>
              {counts.rooms_vacant ?? "—"}
              <span className="text-sm font-normal text-gray-400">
                {" "}
                / {counts.rooms_total ?? "—"}
              </span>
            </>
          }
        />
        <StatCard label="อัตราการเข้าพัก" value={`${occupancy_rate}%`} />
        <StatCard
          label="คำขอรอดำเนินการ"
          value={counts.requests_pending ?? 0}
          tone={counts.requests_pending ? "warning" : "default"}
          hint="ต่อ/ยุติสัญญา"
        />
        {monthly_rent_total !== undefined && (
          <StatCard
            label="รายได้ค่าเช่า/เดือน"
            value={`${fmtBaht(monthly_rent_total)} ฿`}
            hint="ผลรวม rent ของสัญญา active"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="สัญญาใหม่ราย 6 เดือน">
          <NewContractsChart data={new_contracts_monthly} />
        </Card>
        <Card title="สถานะสัญญา">
          <ContractStatusDonut breakdown={status_breakdown} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="สัญญาใกล้หมดอายุ (ภายใน 30 วัน)" bodyClassName="">
          <ExpiringTable rows={expiring} />
        </Card>
        <PendingRequestsPanel />
      </div>
    </div>
  );
}

export default StaffAdminDashboard;
