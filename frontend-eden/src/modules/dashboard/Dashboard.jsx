import { useAuth } from "../../auth/AuthContext";
import { useDashboard } from "../../data/dashboard";
import StaffAdminDashboard from "./StaffAdminDashboard";
import TenantDashboard from "./TenantDashboard";

function Dashboard() {
  const { user } = useAuth();
  const { data, isPending, error } = useDashboard();

  if (error)
    return (
      <div className="p-6 text-red-600 font-sans">
        โหลดข้อมูลไม่สำเร็จ: {error.message}
      </div>
    );
  if (isPending)
    return <div className="p-6 text-gray-400 font-sans">กำลังโหลด...</div>;

  return user?.role === "tenant" ? (
    <TenantDashboard data={data} />
  ) : (
    <StaffAdminDashboard data={data} />
  );
}

export default Dashboard;
