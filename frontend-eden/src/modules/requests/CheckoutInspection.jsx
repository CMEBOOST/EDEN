import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fileUrl } from "../../lib/api";
import { useContract } from "../../data/contracts";
import { useChecklists, useCreateChecklist } from "../../data/checklists";
import { useUpdateRequest } from "../../data/requests";
import ChecklistEditor from "../contracts/ChecklistEditor";

const fmtBaht = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const statusItemStyle = {
  ปกติ: "text-green-700",
  ชำรุด: "text-red-700",
  ต้องซ่อม: "text-amber-700",
};

// หน้าตรวจสภาพห้องออก — เทียบ check-in / check-out + คิดค่าเสียหาย
function CheckoutInspection() {
  const { contractId } = useParams();
  const [params] = useSearchParams();
  const requestId = params.get("request");
  const navigate = useNavigate();

  const { data: contract = null, isPending: loadingContract } =
    useContract(contractId);
  const { data: lists, isPending: loadingLists, error: loadError } =
    useChecklists(contractId);
  const createChecklist = useCreateChecklist();
  const updateRequest = useUpdateRequest();
  const loading = loadingContract || loadingLists;

  const checkin = useMemo(() => {
    const ins = (lists ?? []).filter((l) => l.type === "check-in");
    return ins[ins.length - 1] ?? null;
  }, [lists]);

  const [checkout, setCheckout] = useState([]);
  const [seeded, setSeeded] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // seed รายการตรวจออกจากข้อมูล check-in/out ที่มี — ครั้งเดียวตอนโหลดเสร็จ
  if (!seeded && lists) {
    const outs = lists.filter((l) => l.type === "check-out");
    const ins = lists.filter((l) => l.type === "check-in");
    const source =
      outs[outs.length - 1]?.checklist_items ??
      ins[ins.length - 1]?.checklist_items ??
      [];
    setCheckout(
      source.map((it) => ({
        name: it.name,
        status: "ปกติ",
        note: "",
        photos: [],
        cost: 0,
      }))
    );
    setSeeded(true);
  }

  const damageTotal = useMemo(
    () => checkout.reduce((s, r) => s + (Number(r.cost) || 0), 0),
    [checkout]
  );
  const deposit = Number(contract?.security_deposit || 0);
  const refund = deposit - damageTotal;

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await createChecklist.mutateAsync({
        contractId,
        body: {
          type: "check-out",
          tenant_signature: signature.trim() || null,
          items: checkout.filter((r) => r.name.trim()),
        },
      });
      if (requestId) {
        await updateRequest.mutateAsync({
          id: requestId,
          body: { status: "completed", damage_total: damageTotal },
        });
      }
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <div className="p-6 text-gray-400 font-sans">กำลังโหลด...</div>;
  if (loadError && !contract)
    return (
      <div className="p-6 text-red-600 font-sans">
        โหลดข้อมูลไม่สำเร็จ: {loadError.message}
      </div>
    );

  return (
    <div className="flex flex-col gap-5 font-sans max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/contracts")}
          className="text-gray-500 hover:text-gray-800"
        >
          ← กลับ
        </button>
        <h2 className="text-2xl font-semibold">
          ตรวจสภาพห้องออก · สัญญา #{contractId}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* สภาพตอนเข้าอยู่ (อ้างอิง) */}
      <section className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold mb-2">สภาพห้องตอนเข้าอยู่ (อ้างอิง)</h3>
        {checkin ? (
          <ul className="text-sm flex flex-col gap-1">
            {(checkin.checklist_items ?? []).map((it, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-32 shrink-0">{it.name}</span>
                <span className={statusItemStyle[it.status] ?? "text-gray-500"}>
                  {it.status}
                </span>
                {it.note && (
                  <span className="text-gray-400">— {it.note}</span>
                )}
                {(it.photos ?? []).map((u) => (
                  <img
                    key={u}
                    src={fileUrl(u)}
                    alt=""
                    className="w-10 h-10 object-cover rounded border border-gray-200"
                  />
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">
            ไม่มีบันทึกสภาพห้องตอนเข้าอยู่
          </p>
        )}
      </section>

      {/* ตรวจตอนออก */}
      <section className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
        <h3 className="font-semibold">บันทึกสภาพห้องตอนออก + ค่าเสียหาย</h3>
        <p className="text-xs text-gray-400">
          รายการที่มีสถานะ/หมายเหตุต่างจากตอนเข้าอยู่ ให้ใส่ค่าเสียหายตามจริง
        </p>
        <ChecklistEditor value={checkout} onChange={setCheckout} showCost />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">ชื่อผู้เช่าที่ร่วมตรวจ</span>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full"
          />
        </label>
      </section>

      {/* สรุปเงินประกัน */}
      <section className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-sm flex flex-col gap-1">
        <div className="flex justify-between">
          <span>เงินประกัน</span>
          <span>{fmtBaht(deposit)} ฿</span>
        </div>
        <div className="flex justify-between text-red-700">
          <span>หัก ค่าเสียหายรวม</span>
          <span>− {fmtBaht(damageTotal)} ฿</span>
        </div>
        <div className="flex justify-between font-semibold border-t border-gray-300 pt-1 mt-1">
          <span>{refund >= 0 ? "คืนผู้เช่า" : "ผู้เช่าต้องชำระเพิ่ม"}</span>
          <span>{fmtBaht(Math.abs(refund))} ฿</span>
        </div>
      </section>

      {!done ? (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/contracts")}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "บันทึกผลตรวจ & ยุติสัญญา"}
          </button>
        </div>
      ) : (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-green-800 text-sm font-medium">
            ✓ บันทึกผลตรวจสภาพห้องออก & ยุติสัญญาแล้ว
          </span>
          <p className="text-xs text-gray-500">
            สัญญา #{contractId} ถูกตั้งสถานะเป็น "ยกเลิก" และย้ายไปหน้าประวัติสัญญาเช่าแล้ว
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate("/contracts")}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              กลับหน้าสัญญา
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutInspection;
