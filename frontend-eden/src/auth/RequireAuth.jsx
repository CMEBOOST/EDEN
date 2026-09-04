import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// ครอบ route ที่ต้องล็อกอิน — roles = จำกัดเฉพาะบาง role (ไม่ใส่ = ทุก role)
function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-400 font-sans">
        กำลังโหลด...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-10 text-center font-sans">
        <h2 className="text-xl font-semibold text-gray-800">
          ไม่มีสิทธิ์เข้าถึง
        </h2>
        <p className="text-gray-500 mt-2">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  return children;
}

export default RequireAuth;
