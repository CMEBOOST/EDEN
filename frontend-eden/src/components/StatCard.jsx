// การ์ดตัวเลขสรุป — ใช้ในหน้า Dashboard และหน้าอื่น ๆ
const toneText = {
  default: "text-gray-900",
  warning: "text-amber-600",
  danger: "text-red-600",
  success: "text-green-600",
};

function StatCard({ label, value, hint, icon, tone = "default" }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-sm text-gray-500 flex items-center gap-1.5">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </span>
      <span
        className={`text-2xl font-semibold ${toneText[tone] ?? toneText.default}`}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

export default StatCard;
