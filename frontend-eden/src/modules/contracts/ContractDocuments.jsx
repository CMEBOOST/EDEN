import { useState } from "react";
import { apiUpload, fileUrl } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import {
  useTenantDocuments,
  useAddTenantDocument,
  useDeleteDocument,
} from "../../data/documents";
import ConfirmDialog from "../../components/ConfirmDialog";

const DOC_TYPES = [
  "บัตรประชาชน",
  "ทะเบียนบ้าน",
  "สลิปเงินเดือน",
  "สัญญาเช่า",
  "อื่นๆ",
];

const inputCls =
  "border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500";

// section เอกสารแนบ — เอกสารเป็นของผู้เช่า (ใช้ร่วมกับสัญญาอื่นของผู้เช่ารายเดียวกัน)
// readOnly = ดูอย่างเดียว (หน้าประวัติ) — ซ่อนปุ่มเพิ่ม/ลบ
function ContractDocuments({ tenantId, readOnly = false }) {
  const {
    data: rows = [],
    isPending: loading,
    error: loadError,
  } = useTenantDocuments(tenantId);
  const addDocument = useAddTenantDocument();
  const deleteDocument = useDeleteDocument();

  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const uploading = addDocument.isPending;

  async function handlePick(file) {
    setError(null);
    try {
      const { url } = await apiUpload(file);
      await addDocument.mutateAsync({
        tenantId,
        body: { doc_type: docType, file_url: url },
      });
    } catch (e) {
      setError(`เพิ่มเอกสารไม่สำเร็จ: ${e.message}`);
    }
  }

  async function handleDelete() {
    try {
      await deleteDocument.mutateAsync({ tenantId, docId: deleting.doc_id });
      setDeleting(null);
    } catch (e) {
      alert(`ลบไม่สำเร็จ: ${e.message}`);
    }
  }

  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-lg">เอกสารแนบ</h3>
        <p className="text-xs text-gray-400">
          เอกสารเหล่านี้เป็นของผู้เช่า ใช้ร่วมกับสัญญาอื่นของผู้เช่ารายเดียวกัน
        </p>
      </div>

      {(error || loadError) && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
          {error ?? loadError.message}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">กำลังโหลด...</p>}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-gray-400">ยังไม่มีเอกสาร</p>
      )}

      {!loading && rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-gray-100">
          {rows.map((d) => (
            <li key={d.doc_id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-32 shrink-0 text-gray-700">{d.doc_type}</span>
              <a
                href={fileUrl(d.file_url)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex-1 min-w-0 truncate"
              >
                📄 เปิดดู
              </a>
              <span className="text-xs text-gray-400 shrink-0">
                {formatDate(d.created_at)}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setDeleting(d)}
                  className="px-2 py-1 text-xs rounded text-red-600 hover:bg-red-50 shrink-0"
                >
                  ลบ
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className={`${inputCls} w-40`}
          >
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <label className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">
            {uploading ? "กำลังอัปโหลด..." : "＋ เพิ่มเอกสาร"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files[0]) handlePick(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title="ลบเอกสาร"
          message={`ลบเอกสาร "${deleting.doc_type}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`}
          confirmText="ลบ"
          danger
          busy={deleteDocument.isPending}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

export default ContractDocuments;
