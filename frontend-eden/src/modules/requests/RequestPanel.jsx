import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../lib/datetime";
import { useRequests } from "../../data/requests";
import { typeLabel, typeStyle } from "./requestMeta";
import RenewDialog from "./RenewDialog";
import RejectDialog from "./RejectDialog";

// กล่องคำแจ้งความจำนงที่ยังไม่ดำเนินการ — แสดงบนหน้าสัญญาเช่า (staff/admin)
function RequestPanel() {
  const navigate = useNavigate();
  const { data: pending = [], isPending: p1 } = useRequests("pending");
  const { data: accepted = [], isPending: p2 } = useRequests("accepted");
  const [renewing, setRenewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const rows = [...pending, ...accepted];

  if (p1 || p2 || rows.length === 0) return null;

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-amber-100/70 font-medium text-amber-900">
        คำแจ้งความจำนงรอดำเนินการ ({rows.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">ผู้เช่า</th>
              <th className="px-4 py-2 font-medium">ห้อง / สัญญา</th>
              <th className="px-4 py-2 font-medium">ประเภท</th>
              <th className="px-4 py-2 font-medium">วันที่แจ้ง</th>
              <th className="px-4 py-2 font-medium">วันที่ต้องการ</th>
              <th className="px-4 py-2 font-medium">รายละเอียด</th>
              <th className="px-4 py-2 font-medium text-center">ดำเนินการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {rows.map((r) => (
              <tr key={r.request_id} className="align-top">
                <td className="px-4 py-2.5">{r.tenant_name}</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {r.room_id ?? "-"} · #{r.contract_id}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      typeStyle[r.request_type]
                    }`}
                  >
                    {typeLabel[r.request_type]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {r.preferred_date ? formatDate(r.preferred_date) : "-"}
                </td>
                <td className="px-4 py-2.5 text-gray-600 max-w-xs whitespace-pre-line">
                  {r.tenant_note}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-center gap-2">
                    {r.request_type === "renew" ? (
                      <button
                        onClick={() => setRenewing(r)}
                        className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                      >
                        รับเรื่อง / ต่อสัญญา
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          navigate(
                            `/contracts/${r.contract_id}/checkout?request=${r.request_id}`
                          )
                        }
                        className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                      >
                        ตรวจสภาพห้องออก
                      </button>
                    )}
                    <button
                      onClick={() => setRejecting(r)}
                      className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renewing && (
        <RenewDialog request={renewing} onClose={() => setRenewing(null)} />
      )}
      {rejecting && (
        <RejectDialog request={rejecting} onClose={() => setRejecting(null)} />
      )}
    </div>
  );
}

export default RequestPanel;
