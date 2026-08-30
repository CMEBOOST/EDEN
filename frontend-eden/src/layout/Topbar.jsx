import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { avatarSrc } from "../lib/avatar";

const roleLabel = { admin: "ผู้ดูแลระบบ", staff: "พนักงาน", tenant: "ผู้เช่า" };

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="bg-white h-16 border-b border-gray-200 flex items-center justify-end px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button className="p-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-200">
          🔔
        </button>

        <div className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-lg">
          <img
            src={avatarSrc(user)}
            alt=""
            className="w-6 h-6 rounded-full object-cover"
          />
          <div className="leading-tight">
            <div className="text-sm font-medium text-gray-700">
              {user?.username ?? "-"}
            </div>
            <div className="text-xs text-gray-400">
              {roleLabel[user?.role] ?? user?.role}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

export default TopBar;
