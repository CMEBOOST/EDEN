import { useCallback, useEffect, useState } from "react";
import { apiGet, fileUrl } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import { useAuth } from "../../auth/AuthContext";
import IntentNoticeDialog from "../requests/IntentNoticeDialog";
import { statusLabel, statusStyle, typeLabel, OPEN_STATUSES } from "../requests/requestMeta";

const fmtBaht = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

function StatCard({ label, value, hint }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

function daysBadge(d) {
  if (d <= 7) return "bg-red-100 text-red-700";
  if (d <= 15) return "bg-orange-100 text-orange-700";
  return "bg-amber-100 text-amber-700";
}

function StaffAdminDashboard({ data }) {
  const { counts, expiring, monthly_rent_total } = data;
  return (
    <div className="flex flex-col gap-5 font-sans">
      <h2 className="text-3xl">ภาพรวม</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="ผู้เช่าทั้งหมด" value={counts.tenants} />
        <StatCard label="สัญญาที่ใช้งาน" value={counts.contracts_active} />
        <StatCard label="สัญญาร่าง" value={counts.contracts_draft} />
        <StatCard
          label="คำขอรอดำเนินการ"
          value={counts.requests_pending ?? 0}
          hint="ต่อ/ยุติสัญญา — ดูที่หน้าสัญญาเช่า"
        />
        {monthly_rent_total !== undefined && (
          <StatCard
            label="รายได้ค่าเช่า/เดือน"
            value={`${fmtBaht(monthly_rent_total)} ฿`}
            hint="ผลรวม rent ของสัญญา active"
          />
        )}
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 font-medium">
          สัญญาใกล้หมดอายุ (ภายใน 30 วัน)
        </div>
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
            {expiring.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  ไม่มีสัญญาใกล้หมดอายุ
                </td>
              </tr>
            )}
            {expiring.map((e) => (
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
      </div>
    </div>
  );
}

function RequestStatusBox({ request }) {
  const open = OPEN_STATUSES.includes(request.status);
  return (
    <div
      className={`rounded-lg p-3 text-sm flex flex-col gap-1 ${
        open ? "bg-amber-50" : "bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="text-gray-600">คำแจ้งความจำนง:</span>
        <span className="font-medium">{typeLabel[request.request_type]}</span>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            statusStyle[request.status]
          }`}
        >
          {statusLabel[request.status]}
        </span>
      </span>
      {request.staff_note && (
        <span className="text-gray-500">หมายเหตุ: {request.staff_note}</span>
      )}
    </div>
  );
}

function TenantDashboard({ data, onReload }) {
  const { tenant, contract, documents, rates, request } = data;
  const [showNotice, setShowNotice] = useState(false);
  const canNotify =
    contract &&
    contract.status === "active" &&
    !(request && OPEN_STATUSES.includes(request.status));

  return (
    <div className="flex flex-col gap-5 font-sans max-w-2xl">
      <h2 className="text-3xl">สวัสดี, {tenant?.full_name ?? "ผู้เช่า"}</h2>

      {contract ? (
        <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-lg">สัญญาเช่าปัจจุบัน</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">ห้อง</div>
              <div>{contract.room_id ?? "-"}</div>
            </div>
            <div>
              <div className="text-gray-500">สถานะ</div>
              <div>{contract.status}</div>
            </div>
            <div>
              <div className="text-gray-500">ช่วงสัญญา</div>
              <div>
                {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">ค่าเช่า / เงินประกัน</div>
              <div>
                {fmtBaht(contract.rent)} / {fmtBaht(contract.security_deposit)} ฿
              </div>
            </div>
          </div>
          {contract.contract_file_url && (
            <a
              href={fileUrl(contract.contract_file_url)}
              target="_blank"
              rel="noreferrer"
              className="self-start text-sm text-blue-600 hover:underline"
            >
              📄 ดาวน์โหลดสัญญา
            </a>
          )}

          {request && <RequestStatusBox request={request} />}

          {canNotify && (
            <button
              type="button"
              onClick={() => setShowNotice(true)}
              className="self-start px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              แจ้งความจำนงล่วงหน้า (ต่อ/ยุติสัญญา)
            </button>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-5 text-gray-500">
          ยังไม่มีข้อมูลสัญญา — ติดต่อเจ้าหน้าที่หอพัก
        </div>
      )}

      {showNotice && (
        <IntentNoticeDialog
          contractId={contract.contract_id}
          onClose={() => setShowNotice(false)}
          onDone={onReload}
        />
      )}

      <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-2">
        <h3 className="font-semibold text-lg">เอกสารของฉัน</h3>
        {documents.length === 0 && (
          <span className="text-gray-400 text-sm">ยังไม่มีเอกสาร</span>
        )}
        {documents.map((d) => (
          <a
            key={d.doc_id}
            href={fileUrl(d.file_url)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            📎 {d.doc_type}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["water", "electric"].map((t) => (
          <div key={t} className="border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">
              {t === "water" ? "ค่าน้ำ" : "ค่าไฟ"} (บาท/หน่วย)
            </div>
            <div className="text-xl font-semibold">
              {rates[t] ? fmtBaht(rates[t].rate_value) : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiGet("/dashboard/")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return <div className="p-6 text-red-600 font-sans">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  if (!data)
    return <div className="p-6 text-gray-400 font-sans">กำลังโหลด...</div>;

  return user?.role === "tenant" ? (
    <TenantDashboard data={data} onReload={load} />
  ) : (
    <StaffAdminDashboard data={data} />
  );
}

export default Dashboard;
