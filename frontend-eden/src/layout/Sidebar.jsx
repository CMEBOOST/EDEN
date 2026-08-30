import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function Sidebar() {
  const { user } = useAuth();
  return (
    // เปลี่ยนสีพื้นหลังเป็นสีน้ำเงินเข้ม (bg-[#151f32]) 
    <div className="w-64 bg-[#151f32] text-gray-300 flex flex-col h-screen shrink">
      
      {/* โลโก้ EDEN PLACE */}
      <div className="h-16 flex items-center justify-center border-b border-gray-700/50">
        <div className="border border-gray-400 px-6 py-1 rounded tracking-widest text-sm font-bold text-white">
          EDEN PLACE
        </div>
      </div>
      
      {/* เมนูนำทาง */}
      <div className="p-4 flex flex-col gap-1">
        <p className="text-xs text-gray-500 font-semibold mb-2 px-2">ทั่วไป</p>
        
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-900/50 hover:text-white transition-colors">
          📊 แดชบอร์ด
        </Link>
        <Link to="/tenants" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-900/50 hover:text-white transition-colors">
          🧑‍💼 ผู้เช่า
        </Link>
        <Link to="/contracts" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-900/50 hover:text-white transition-colors">
          📜 สัญญาเช่า
        </Link>
        <Link to="/rate" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-900/50 hover:text-white transition-colors">
          💵 อัตราค่าบริการ
        </Link>
        {user?.role === "admin" && (
          <Link to="/permission" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-900/50 hover:text-white transition-colors">
            🔐 จัดการสิทธ์
          </Link>
        )}
        <Link to="/log" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-900/50 hover:text-white transition-colors">
          🪵 Audit Log
        </Link>
      </div>

    </div>
  );
}

export default Sidebar;