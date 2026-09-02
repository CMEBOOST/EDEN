import { useMemo, useState } from "react";
import { formatDate } from "../../lib/datetime";
import { useRates, useCurrentRates, useDeleteRate } from "../../data/rates";
import ConfirmDialog from "../../components/ConfirmDialog";
import RateForm from "./RateForm";

const typeLabel = { water: "ค่าน้ำ", electric: "ค่าไฟ" };
const typeStyle = {
  water: "bg-sky-100 text-sky-700",
  electric: "bg-amber-100 text-amber-700",
};

const fmtBaht = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

function Rates() {
  const { data: rates = [], isPending: loading, error } = useRates();
  const { data: current = { water: null, electric: null } } = useCurrentRates();
  const deleteRate = useDeleteRate();
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // id ของอัตราที่ "ใช้อยู่" ตอนนี้ (แยกตามประเภท)
  const activeIds = useMemo(
    () =>
      new Set(
        [current.water?.rate_id, current.electric?.rate_id].filter(Boolean)
      ),
    [current]
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  function rowStatus(r) {
    if (r.effective_date > todayStr)
      return { label: "รอมีผล", cls: "bg-blue-100 text-blue-700" };
    if (activeIds.has(r.rate_id))
      return { label: "ใช้อยู่", cls: "bg-green-100 text-green-700" };
    return { label: "ประวัติ", cls: "bg-gray-100 text-gray-400" };
  }

  async function handleDelete() {
    try {
      await deleteRate.mutateAsync(deleting.rate_id);
      setDeleting(null);
    } catch (e) {
      alert(`ลบไม่สำเร็จ: ${e.message}`);
    }
  }

  const filtered = useMemo(
    () =>
      typeFilter === "all" ? rates : rates.filter((r) => r.type === typeFilter),
    [rates, typeFilter]
  );

  return (
    <div className="p-2 flex flex-col gap-3 font-sans">
      <div className="flex justify-between">
        <div>
          <h2 className="text-3xl">อัตราค่าบริการ</h2>
          <p className="text-gray-500">ประวัติอัตราค่าน้ำ / ค่าไฟ</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 h-fit"
        >
          เพิ่มอัตรา
        </button>
      </div>

      {/* การ์ดสรุปอัตราปัจจุบัน */}
      <div className="grid grid-cols-2 gap-3">
        {["water", "electric"].map((t) => (
          <div
            key={t}
            className="border border-gray-200 rounded-xl p-4 flex flex-col gap-1"
          >
            <span className="text-sm text-gray-500">
              {typeLabel[t]} — อัตราปัจจุบัน
            </span>
            {current[t] ? (
              <>
                <span className="text-2xl font-semibold">
                  {fmtBaht(current[t].rate_value)}{" "}
                  <span className="text-sm font-normal text-gray-400">
                    บาท/หน่วย
                  </span>
                </span>
                <span className="text-xs text-gray-400">
                  มีผลตั้งแต่ {formatDate(current[t].effective_date)}
                </span>
              </>
            ) : (
              <span className="text-gray-400 text-sm">ยังไม่ตั้ง</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[
          ["all", "ทั้งหมด"],
          ["water", "ค่าน้ำ"],
          ["electric", "ค่าไฟ"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTypeFilter(v)}
            className={`px-3 py-1.5 text-sm rounded ${
              typeFilter === v
                ? "bg-blue-500 text-white"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">ประเภท</th>
              <th className="px-4 py-3 font-medium text-right">เรท (บาท/หน่วย)</th>
              <th className="px-4 py-3 font-medium">มีผลตั้งแต่</th>
              <th className="px-4 py-3 font-medium text-center">สถานะ</th>
              <th className="px-4 py-3 font-medium text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  โหลดข้อมูลไม่สำเร็จ: {error.message}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  ยังไม่มีอัตราค่าบริการ
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filtered.map((r) => {
                const st = rowStatus(r);
                return (
                  <tr
                    key={r.rate_id}
                    className={`transition-colors hover:bg-gray-50 ${
                      st.label === "ประวัติ" ? "bg-gray-50/50" : "bg-white"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          typeStyle[r.type] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {typeLabel[r.type] ?? r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      {fmtBaht(r.rate_value)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(r.effective_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setEditing(r)}
                          className="px-2 py-1 text-xs rounded text-blue-600 hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => setDeleting(r)}
                          className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {(showForm || editing) && (
        <RateForm
          rate={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onEditExisting={(id) => {
            const target = rates.find((r) => r.rate_id === id);
            if (target) {
              setShowForm(false);
              setEditing(target);
            }
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="ลบอัตราค่าบริการ"
          message={
            (activeIds.has(deleting.rate_id)
              ? "⚠️ นี่คืออัตราที่ใช้อยู่ตอนนี้ — ลบแล้วระบบจะกลับไปใช้อัตราก่อนหน้า\n\n"
              : "") +
            `ลบ ${typeLabel[deleting.type] ?? deleting.type} เรท ${fmtBaht(
              deleting.rate_value
            )} (มีผล ${formatDate(deleting.effective_date)}) ?`
          }
          confirmText="ลบ"
          danger
          busy={deleteRate.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default Rates;
