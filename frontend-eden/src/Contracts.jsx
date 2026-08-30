const contracts = [
  {
    room: "A101",
    tenant: "สมชาย ใจดี",
    start: "01/01/2025",
    end: "31/12/2025",
    rent: 3500,
    status: "active",
  },
  {
    room: "A102",
    tenant: "สมหญิง รักเรียน",
    start: "15/03/2025",
    end: "14/03/2026",
    rent: 4000,
    status: "active",
  },
  {
    room: "B201",
    tenant: "อนุชา ตั้งใจ",
    start: "01/06/2024",
    end: "31/05/2025",
    rent: 3800,
    status: "expiring",
  },
  {
    room: "B202",
    tenant: "-",
    start: "-",
    end: "-",
    rent: 4200,
    status: "vacant",
  },
];

const statusStyle = {
  active: "bg-green-100 text-green-700",
  expiring: "bg-amber-100 text-amber-700",
  vacant: "bg-gray-100 text-gray-500",
};

const statusLabel = {
  active: "ใช้งาน",
  expiring: "ใกล้หมดอายุ",
  vacant: "ว่าง",
};

function Contracts() {
    return (
    <div className="p-2 flex flex-col gap-2 font-sans">
      <div className="flex justify-between">
        <div>
          <h2 className="text-3xl">สัญญาเช่า</h2>
          <p className="text-gray-500">ห้องเช่าทั้งหมด</p>
        </div>
        <div>
          <button className="px-3 py-2 bg-blue-500 rounded text-gray-100 hover:bg-blue-600">เพื่อสัญญา</button>
        </div>
      </div>

      <div className="bg-gray-50 flex p-2 justify-start items-center rounded">
        <input type="text" name="search" placeholder="ค้นหาเลขห้อง ผู้เช่า" />
      </div>

      <div>
        <ul className="flex gap-3">
            <li className="p-2 bg-gray-50 rounded hover:bg-gray-100">ทั้งหมด</li>
            <li className="p-2 bg-gray-50 rounded hover:bg-gray-100">ค่าเช่า</li>
            <li className="p-2 bg-gray-50 rounded hover:bg-gray-100">สถานะ</li>
        </ul>
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
            {contracts.map((c) => (
              <tr key={c.room} className="bg-white hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{c.room}</td>
                <td className="px-4 py-3 text-gray-700">{c.tenant}</td>
                <td className="px-4 py-3 text-gray-500">{c.start}</td>
                <td className="px-4 py-3 text-gray-500">{c.end}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {c.rent.toLocaleString()} ฿
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[c.status]}`}
                  >
                    {statusLabel[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button className="px-2 py-1 text-xs rounded text-blue-600 hover:bg-blue-50">
                      แก้ไข
                    </button>
                    <button className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50">
                      ลบ
                    </button>
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

export default Contracts