import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { formatTimestamp } from "../../lib/datetime";

const PAGE = 50;

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    apiGet("/users/")
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const load = useCallback(
    async (skip) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ skip, limit: PAGE });
        if (userId) params.set("user_id", userId);
        if (q.trim()) params.set("q", q.trim());
        const batch = await apiGet(`/audit-logs/?${params}`);
        setLogs((prev) => (skip === 0 ? batch : [...prev, ...batch]));
        setHasMore(batch.length === PAGE);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [userId, q]
  );

  // โหลดใหม่เมื่อ filter เปลี่ยน (debounce เบา ๆ สำหรับช่องค้นหา)
  useEffect(() => {
    const t = setTimeout(() => load(0), 250);
    return () => clearTimeout(t);
  }, [load]);

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
                  {error}
                </td>
              </tr>
            )}
            {!error && logs.length === 0 && !loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  ไม่มีบันทึก
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
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && !loading && (
        <button
          onClick={() => load(logs.length)}
          className="self-center px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
        >
          โหลดเพิ่ม
        </button>
      )}
    </div>
  );
}

export default AuditLog;
