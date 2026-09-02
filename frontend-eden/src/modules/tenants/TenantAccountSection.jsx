import { formatDate } from "../../lib/datetime";
import { avatarSrc } from "../../lib/avatar";

const roleLabel = { admin: "ผู้ดูแลระบบ", staff: "พนักงาน", tenant: "ผู้เช่า" };

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800">{children}</span>
    </div>
  );
}

function TenantAccountSection({ user }) {
  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-lg">บัญชีผู้ใช้</h3>

      {!user ? (
        <p className="text-sm text-gray-400">โหลดข้อมูลบัญชีไม่ได้</p>
      ) : (
        <div className="flex items-center gap-4">
          <img
            src={avatarSrc(user)}
            alt=""
            className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            <Row label="ชื่อผู้ใช้">{user.username}</Row>
            <Row label="สิทธิ์">{roleLabel[user.role] ?? user.role}</Row>
            <Row label="สถานะ">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {user.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
              </span>
            </Row>
            <Row label="สร้างบัญชีเมื่อ">{formatDate(user.created_at)}</Row>
          </div>
        </div>
      )}
    </section>
  );
}

export default TenantAccountSection;
