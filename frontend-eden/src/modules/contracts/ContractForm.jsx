import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiUpload } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import ChecklistEditor from "./ChecklistEditor";
import DocumentUploader from "./DocumentUploader";
import FileDropField from "../../components/FileDropField";

const fmtBaht = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

const STATUS_OPTIONS = [
  ["draft", "ร่าง"],
  ["active", "ใช้งาน"],
  ["expired", "หมดอายุ"],
  ["terminated", "ยกเลิก"],
];

const DEFAULT_CHECKLIST = [
  "แอร์",
  "ทีวี",
  "ตู้เย็น",
  "เครื่องทำน้ำอุ่น",
  "ประตู",
  "หน้าต่าง",
  "เตียง",
  "พัดลม",
].map((name) => ({ name, status: "ปกติ", note: "", photos: [] }));

function Card({ title, children }) {
  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function ContractForm() {
  const navigate = useNavigate();

  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]); // ห้องว่าง (สำหรับ dropdown)
  const [contract, setContract] = useState({
    tenant_id: "",
    room_id: "",
    start_date: "",
    end_date: "",
    rent: "",
    security_deposit: "",
    status: "draft",
    special_conditions: "",
  });
  const [contractFile, setContractFile] = useState(null); // File ที่ยังไม่อัป
  const [signature, setSignature] = useState("");
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [documents, setDocuments] = useState([]);

  const [rates, setRates] = useState(null); // อัตราค่าน้ำ/ค่าไฟ ณ วันเริ่มสัญญา (แสดงเฉย ๆ)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/tenants/")
      .then(setTenants)
      .catch((e) => setError(e.message));
    apiGet("/rooms/?available=true")
      .then(setRooms)
      .catch(() => setRooms([]));
  }, []);

  // เลือกห้อง -> เติมค่าเช่าตั้งต้นของห้องนั้นให้ (แก้ต่อได้)
  const pickRoom = (e) => {
    const roomId = e.target.value;
    const room = rooms.find((r) => String(r.room_id) === roomId);
    setContract((c) => ({
      ...c,
      room_id: roomId,
      rent: room ? String(room.base_rent) : c.rent,
    }));
  };

  // ดึงอัตราที่มีผล ณ วันเริ่มสัญญา (ไม่ได้เก็บลง contract — ใช้ประกอบการพิจารณา)
  useEffect(() => {
    const q = contract.start_date ? `?date=${contract.start_date}` : "";
    apiGet(`/rates/current${q}`)
      .then(setRates)
      .catch(() => setRates(null));
  }, [contract.start_date]);

  const set = (key) => (e) =>
    setContract((c) => ({ ...c, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // 1. ไฟล์สัญญา
      let contractFileUrl = null;
      if (contractFile) {
        contractFileUrl = (await apiUpload(contractFile)).url;
      }

      // 2. สัญญา + checklist check-in + เอกสาร — ทรานแซกชันเดียว (atomic)
      await apiPost("/contracts/", {
        tenant_id: Number(contract.tenant_id),
        room_id: contract.room_id ? Number(contract.room_id) : null,
        start_date: contract.start_date,
        end_date: contract.end_date,
        rent: Number(contract.rent),
        security_deposit: Number(contract.security_deposit),
        status: contract.status,
        special_conditions: contract.special_conditions.trim() || null,
        contract_file_url: contractFileUrl,
        checkin_items: checklist.filter((r) => r.name.trim()),
        tenant_signature: signature.trim() || null,
        documents: documents
          .filter((d) => d.file_url)
          .map((d) => ({ doc_type: d.doc_type, file_url: d.file_url })),
      });

      navigate("/contracts");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-sans max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/contracts")}
          className="text-gray-500 hover:text-gray-800"
        >
          ← กลับ
        </button>
        <h2 className="text-2xl font-semibold">สร้างสัญญาเช่า</h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* ส่วนที่ 1 */}
      <Card title="1. ข้อมูลสัญญาเช่า">
        <div className="grid grid-cols-2 gap-4">
          <Field label="ผู้เช่า" required>
            <select
              required
              value={contract.tenant_id}
              onChange={set("tenant_id")}
              className={inputCls}
            >
              <option value="">— เลือกผู้เช่า —</option>
              {tenants.map((t) => (
                <option key={t.tenant_id} value={t.tenant_id}>
                  {t.full_name} · #{t.tenant_id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ห้อง">
            <select
              value={contract.room_id}
              onChange={pickRoom}
              className={inputCls}
            >
              <option value="">— ไม่ระบุห้อง —</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.room_id} · ชั้น {r.floor} · {Number(r.base_rent).toLocaleString()} ฿
                </option>
              ))}
            </select>
          </Field>
          <Field label="วันเริ่มสัญญา" required>
            <input
              type="date"
              required
              value={contract.start_date}
              onChange={set("start_date")}
              className={inputCls}
            />
          </Field>
          <Field label="วันสิ้นสุดสัญญา" required>
            <input
              type="date"
              required
              value={contract.end_date}
              onChange={set("end_date")}
              className={inputCls}
            />
          </Field>
          <Field label="ค่าเช่า/เดือน (บาท)" required>
            <input
              type="number"
              required
              min="0"
              value={contract.rent}
              onChange={set("rent")}
              className={inputCls}
            />
          </Field>
          <Field label="เงินประกัน (บาท)" required>
            <input
              type="number"
              required
              min="0"
              value={contract.security_deposit}
              onChange={set("security_deposit")}
              className={inputCls}
            />
          </Field>
          <Field label="สถานะ">
            <select
              value={contract.status}
              onChange={set("status")}
              className={inputCls}
            >
              {STATUS_OPTIONS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-sm flex flex-col gap-1">
          <span className="font-medium text-sky-800">
            อัตราค่าบริการ
            {contract.start_date
              ? ` ณ ${formatDate(contract.start_date)}`
              : " ปัจจุบัน"}
          </span>
          <div className="flex gap-6 text-gray-700">
            <span>
              💧 ค่าน้ำ:{" "}
              {rates?.water
                ? `${fmtBaht(rates.water.rate_value)} บาท/หน่วย`
                : "— ยังไม่ตั้ง"}
            </span>
            <span>
              ⚡ ค่าไฟ:{" "}
              {rates?.electric
                ? `${fmtBaht(rates.electric.rate_value)} บาท/หน่วย`
                : "— ยังไม่ตั้ง"}
            </span>
          </div>
          <span className="text-xs text-sky-700/70">
            * แสดงเพื่อประกอบการพิจารณา — บิลแต่ละเดือนคิดตามอัตราที่มีผลในเดือนนั้น
            (สัญญาไม่ได้ผูกกับเรทนี้)
          </span>
        </div>

        <Field label="เงื่อนไขพิเศษ">
          <textarea
            rows={2}
            value={contract.special_conditions}
            onChange={set("special_conditions")}
            className={inputCls}
          />
        </Field>

        <Field label="ไฟล์สัญญา (PDF / รูป)">
          <FileDropField value={contractFile} onChange={setContractFile} />
        </Field>
      </Card>

      {/* ส่วนที่ 2 */}
      <Card title="2. บันทึกสภาพห้อง (ตอนเข้าอยู่)">
        <ChecklistEditor value={checklist} onChange={setChecklist} />
        <Field label="ชื่อผู้เช่าที่ตรวจรับสภาพห้อง">
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className={inputCls}
          />
        </Field>
      </Card>

      {/* ส่วนที่ 3 */}
      <Card title="3. เอกสารแนบ">
        <DocumentUploader value={documents} onChange={setDocuments} />
      </Card>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate("/contracts")}
          className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึกสัญญา"}
        </button>
      </div>
    </form>
  );
}

export default ContractForm;
