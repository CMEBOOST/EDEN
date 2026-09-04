import { useState } from "react";
import { apiUpload } from "../../lib/api";

const DOC_TYPES = [
  "บัตรประชาชน",
  "ทะเบียนบ้าน",
  "สลิปเงินเดือน",
  "สัญญาเช่า",
  "อื่นๆ",
];

const inputCls =
  "border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500";

// value = [{doc_type, file_url, filename}], onChange(newValue)
function DocumentUploader({ value, onChange }) {
  const [uploadingRow, setUploadingRow] = useState(null);

  const update = (i, patch) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const addRow = () =>
    onChange([
      ...value,
      { doc_type: DOC_TYPES[0], file_url: "", filename: "" },
    ]);

  const removeRow = (i) => onChange(value.filter((_, idx) => idx !== i));

  async function pickFile(i, file) {
    setUploadingRow(i);
    try {
      const { url, filename } = await apiUpload(file);
      update(i, { file_url: url, filename });
    } catch (e) {
      alert(`อัปโหลดไฟล์ไม่สำเร็จ: ${e.message}`);
    } finally {
      setUploadingRow(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={row.doc_type}
            onChange={(e) => update(i, { doc_type: e.target.value })}
            className={`${inputCls} w-40`}
          >
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <label className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">
            {uploadingRow === i
              ? "กำลังอัปโหลด..."
              : row.filename || "เลือกไฟล์"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) pickFile(i, e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>

          {row.file_url && (
            <span className="text-green-600 text-xs">✓ แนบแล้ว</span>
          )}

          <button
            type="button"
            onClick={() => removeRow(i)}
            className="px-2 text-red-600 hover:bg-red-50 rounded text-sm"
          >
            ลบ
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="self-start px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
      >
        ＋ เพิ่มเอกสาร
      </button>
    </div>
  );
}

export default DocumentUploader;
