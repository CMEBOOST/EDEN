import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logoEden from "../../assets/logoEden.webp";

const linkCls =
  "flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-900/50 hover:text-white transition-colors";

function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;
  const isStaff = role === "admin" || role === "staff";
  const isAdmin = role === "admin";

  return (
    <div className="w-64 bg-[#151f32] text-gray-300 flex flex-col h-screen shrink">
      <div className="h-16 flex items-center justify-center border-b border-gray-700/50 bg-[#25262a]">
        <img
          src={logoEden}
          alt="EDEN PLACE"
          className="h-9 w-auto object-contain rounded"
        />
      </div>

      <div className="p-4 flex flex-col gap-1">
        <p className="text-xs text-gray-500 font-semibold mb-2 px-2">ทั่วไป</p>

        <Link to="/" className={linkCls}>
          📊 หน้าแรก
        </Link>

        {isStaff && (
          <>
            <Link to="/tenants" className={linkCls}>
              🧑‍💼 ผู้เช่า
            </Link>
            <Link to="/contracts" className={linkCls}>
              📜 สัญญาเช่า
            </Link>
            <Link to="/users" className={linkCls}>
              👥 จัดการผู้ใช้
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <Link to="/rate" className={linkCls}>
              💵 อัตราค่าบริการ
            </Link>
            <Link to="/log" className={linkCls}>
              🪵 Audit Log
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
