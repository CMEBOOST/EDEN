// พาเนลมีกรอบ + หัวข้อ (option) — ใช้ห่อกราฟ / ตารางในหน้า Dashboard
function Card({
  title,
  action,
  children,
  bodyClassName = "p-4",
  className = "",
}) {
  return (
    <div
      className={`border border-gray-200 rounded-xl overflow-hidden flex flex-col ${className}`}
    >
      {(title || action) && (
        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-2">
          <span className="font-medium">{title}</span>
          {action}
        </div>
      )}
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export default Card;
