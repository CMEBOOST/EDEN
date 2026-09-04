import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TH_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

// "2026-09" -> "ก.ย."
function monthLabel(iso) {
  const m = Number(iso.slice(5, 7));
  return TH_MONTHS[m - 1] ?? iso;
}

function NewContractsChart({ data = [] }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            formatter={(v) => [`${v} สัญญา`, "สัญญาใหม่"]}
            labelStyle={{ color: "#374151" }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar
            dataKey="count"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default NewContractsChart;
