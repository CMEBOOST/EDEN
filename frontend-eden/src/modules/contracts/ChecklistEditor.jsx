import { useState } from "react";
import { apiUpload, fileUrl } from "../../lib/api";

const STATUS_OPTIONS = ["ปกติ", "ชำรุด", "ต้องซ่อม"];

const inputCls =
  "border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 w-full";

// value = [{name, status, note, photos:[url]}], onChange(newValue)
function ChecklistEditor({ value, onChange }) {
  const [uploadingRow, setUploadingRow] = useState(null);

  const update = (i, patch) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const addRow = () =>
    onChange([...value, { name: "", status: "ปกติ", note: "", photos: [] }]);

  const removeRow = (i) => onChange(value.filter((_, idx) => idx !== i));

  async function addPhotos(i, files) {
    setUploadingRow(i);
    try {
      const uploaded = [];
      for (const f of files) {
        const { url } = await apiUpload(f);
        uploaded.push(url);
      }
      update(i, { photos: [...value[i].photos, ...uploaded] });
    } catch (e) {
      alert(`อัปโหลดรูปไม่สำเร็จ: ${e.message}`);
    } finally {
      setUploadingRow(null);
    }
  }

  const removePhoto = (i, url) =>
    update(i, { photos: value[i].photos.filter((p) => p !== url) });

  return (
    <div className="flex flex-col gap-3">
      {value.map((row, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              placeholder="รายการ (เช่น แอร์)"
              value={row.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className={`${inputCls} flex-1`}
            />
            <select
              value={row.status}
              onChange={(e) => update(i, { status: e.target.value })}
              className={`${inputCls} w-28`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="px-2 text-red-600 hover:bg-red-50 rounded text-sm"
            >
              ลบ
            </button>
          </div>

          <input
            placeholder="หมายเหตุ"
            value={row.note ?? ""}
            onChange={(e) => update(i, { note: e.target.value })}
            className={inputCls}
          />

          <div className="flex flex-wrap items-center gap-2">
            {row.photos.map((url) => (
              <div key={url} className="relative">
                <img
                  src={fileUrl(url)}
                  alt=""
                  className="w-16 h-16 object-cover rounded border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i, url)}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none"
                >
                  &times;
                </button>
              </div>
            ))}

            <label className="w-16 h-16 flex items-center justify-center border border-dashed border-gray-300 rounded cursor-pointer text-gray-400 hover:border-blue-400 text-xs text-center">
              {uploadingRow === i ? "..." : "＋ รูป"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files.length) addPhotos(i, [...e.target.files]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="self-start px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
      >
        ＋ เพิ่มรายการ
      </button>
    </div>
  );
}

export default ChecklistEditor;
