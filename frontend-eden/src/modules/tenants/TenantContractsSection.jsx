import { useNavigate } from "react-router-dom";
import { formatDate } from "../../lib/datetime";

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

function TenantContractsSection({ contracts }) {
  const navigate = useNavigate();

  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-lg">สัญญาเช่า</h3>

      {contracts.length === 0 ? (
        <p className="text-sm text-gray-400">ยังไม่มีสัญญา</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-2 font-medium">ห้อง</th>
                <th className="px-4 py-2 font-medium">เริ่ม</th>
                <th className="px-4 py-2 font-medium">สิ้นสุด</th>
                <th className="px-4 py-2 font-medium text-right">ค่าเช่า/เดือน</th>
                <th className="px-4 py-2 font-medium text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => (
                <tr
                  key={c.contract_id}
                  onClick={() => navigate(`/contracts/${c.contract_id}`)}
                  className="bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {c.room_id ?? "-"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {formatDate(c.start_date)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {formatDate(c.end_date)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">
                    {Number(c.rent).toLocaleString()} ฿
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusStyle[c.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default TenantContractsSection;
