function TopBar() {
  return (
    // แถบสีขาว มีเส้นขอบล่าง (border-b)
    <div className="bg-white h-16 border-b border-gray-200 flex items-center justify-end px-6 shadow-sm">

      {/* ฝั่งขวา: ไอคอนการแจ้งเตือน และ โปรไฟล์ */}
      <div className="flex items-center gap-4">
        <button className="p-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-200">
          🌙
        </button>
        <button className="p-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-200">
          🔔
        </button>
        <div className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50">
          <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
          {/* //พนักงาน เปลี่ยนตาม role */}
          <span className="text-sm font-medium text-gray-700">พนักงาน</span>
        </div>
      </div>

    </div>
  );
}

export default TopBar;