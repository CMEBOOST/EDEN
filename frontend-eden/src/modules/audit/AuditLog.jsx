import { useEffect, useMemo, useState } from "react";
import { formatTimestamp } from "../../lib/datetime";
import { useAuditLogs } from "../../data/audit";
import { useUsers } from "../../data/users";

function AuditLog() {
  const { data: users = [] } = useUsers();
  const [userId, setUserId] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // debounce ช่องค้นหาเบา ๆ
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const {
    data,
    isPending: loading,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
  } = useAuditLogs({ userId, q: debouncedQ });

  const logs = useMemo(() => (data?.pages ?? []).flat(), [data]);

  return (
    <div className="p-2 flex flex-col gap-3 font-sans">
      <div>
        <h2 className="text-3xl">Audit Log</h2>
        <p className="text-gray-500">ประวัติการเปลี่ยนแปลงข้อมูลในระบบ</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="">ผู้ใช้ทั้งหมด</option>
          {users.map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {u.username}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาการกระทำ เช่น ลบ, สัญญา"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 min-w-48"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium w-48">เวลา</th>
              <th className="px-4 py-3 font-medium w-32">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">การกระทำ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {error && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-red-600">
                  โหลดข้อมูลไม่สำเร็จ: {error.message}
                </td>
              </tr>
            )}
            {!error && logs.length === 0 && !loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  ยังไม่มีบันทึก
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.log_id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-500 tabular-nums">
                  {formatTimestamp(l.created_at)}
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {l.username ?? "-"}
                </td>
                <td className="px-4 py-2.5 text-gray-800">{l.action}</td>
              </tr>
            ))}
            {(loading || isFetchingNextPage) && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasNextPage && !isFetchingNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="self-center px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
        >
          โหลดเพิ่ม
        </button>
      )}
    </div>
  );
}

export default AuditLog;
