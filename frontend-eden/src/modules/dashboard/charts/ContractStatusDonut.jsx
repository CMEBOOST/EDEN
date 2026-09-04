import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const META = [
  { key: "active", label: "ใช้งาน", color: "#3b82f6" },
  { key: "draft", label: "ร่าง", color: "#22c55e" },
  { key: "expired", label: "หมดอายุ", color: "#9ca3af" },
  { key: "terminated", label: "ยุติ", color: "#ef4444" },
];

function ContractStatusDonut({ breakdown = {} }) {
  const data = META.map((m) => ({
    name: m.label,
    value: breakdown[m.key] ?? 0,
    color: m.color,
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="h-40 w-40 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={
                total === 0
                  ? [{ name: "ไม่มีข้อมูล", value: 1, color: "#e5e7eb" }]
                  : data
              }
              dataKey="value"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={total === 0 ? 0 : 2}
              stroke="none"
            >
              {(total === 0 ? [{ color: "#e5e7eb" }] : data).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            {total > 0 && (
              <Tooltip
                formatter={(v, n) => [`${v} สัญญา`, n]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-semibold">{total}</span>
          <span className="text-xs text-gray-400">ทั้งหมด</span>
        </div>
      </div>
      <ul className="text-sm text-gray-600 flex flex-col gap-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="text-gray-500">{d.name}</span>
            <span className="font-medium text-gray-800">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ContractStatusDonut;
