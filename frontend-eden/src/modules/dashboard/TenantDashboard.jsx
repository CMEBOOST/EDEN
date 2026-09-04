import { useState } from "react";
import { fileUrl } from "../../lib/api";
import { formatDate } from "../../lib/datetime";
import { useCancelRequest } from "../../data/requests";
import ConfirmDialog from "../../components/ConfirmDialog";
import IntentNoticeDialog from "../requests/IntentNoticeDialog";
import {
  statusLabel,
  statusStyle,
  typeLabel,
  OPEN_STATUSES,
} from "../requests/requestMeta";

const fmtBaht = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

function RequestStatusBox({ request, onCancel }) {
  const open = OPEN_STATUSES.includes(request.status);
  return (
    <div
      className={`rounded-lg p-3 text-sm flex flex-col gap-1 ${
        open ? "bg-amber-50" : "bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-2 flex-wrap">
        <span className="text-gray-600">คำแจ้งความจำนง:</span>
        <span className="font-medium">{typeLabel[request.request_type]}</span>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            statusStyle[request.status]
          }`}
        >
          {statusLabel[request.status]}
        </span>
        {request.status === "pending" && (
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto text-xs text-red-600 hover:underline"
          >
            ยกเลิกการแจ้ง
          </button>
        )}
      </span>
      {request.status === "pending" && (
        <span className="text-xs text-gray-400">
          ยกเลิกได้ก่อนเจ้าหน้าที่รับเรื่อง (เผื่อแจ้งผิด)
        </span>
      )}
      {request.staff_note && (
        <span className="text-gray-500">หมายเหตุ: {request.staff_note}</span>
      )}
    </div>
  );
}

function TenantDashboard({ data }) {
  const { tenant, contract, documents, rates, request } = data;
  const cancelRequest = useCancelRequest();
  const [showNotice, setShowNotice] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const canNotify =
    contract &&
    contract.status === "active" &&
    !(request && OPEN_STATUSES.includes(request.status));

  async function handleCancel() {
    try {
      await cancelRequest.mutateAsync(request.request_id);
      setCancelling(false);
    } catch (e) {
      alert(`ยกเลิกไม่สำเร็จ: ${e.message}`);
    }
  }

  return (
    <div className="flex flex-col gap-5 font-sans max-w-2xl">
      <h2 className="text-3xl">สวัสดี, {tenant?.full_name ?? "ผู้เช่า"}</h2>

      {contract ? (
        <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-lg">สัญญาเช่าปัจจุบัน</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500">ห้อง</div>
              <div>{contract.room_id ?? "-"}</div>
            </div>
            <div>
              <div className="text-gray-500">สถานะ</div>
              <div>{contract.status}</div>
            </div>
            <div>
              <div className="text-gray-500">ช่วงสัญญา</div>
              <div>
                {formatDate(contract.start_date)} –{" "}
                {formatDate(contract.end_date)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">ค่าเช่า / เงินประกัน</div>
              <div>
                {fmtBaht(contract.rent)} / {fmtBaht(contract.security_deposit)}{" "}
                ฿
              </div>
            </div>
          </div>
          {contract.contract_file_url && (
            <a
              href={fileUrl(contract.contract_file_url)}
              target="_blank"
              rel="noreferrer"
              className="self-start text-sm text-blue-600 hover:underline"
            >
              📄 ดาวน์โหลดสัญญา
            </a>
          )}

          {request && (
            <RequestStatusBox
              request={request}
              onCancel={() => setCancelling(true)}
            />
          )}

          {canNotify && (
            <button
              type="button"
              onClick={() => setShowNotice(true)}
              className="self-start px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              แจ้งความจำนงล่วงหน้า (ต่อ/ยุติสัญญา)
            </button>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-5 text-gray-500">
          ยังไม่มีข้อมูลสัญญา — ติดต่อเจ้าหน้าที่หอพัก
        </div>
      )}

      {showNotice && (
        <IntentNoticeDialog
          contractId={contract.contract_id}
          onClose={() => setShowNotice(false)}
        />
      )}

      {cancelling && (
        <ConfirmDialog
          title="ยกเลิกการแจ้งความจำนง"
          message={`ยกเลิกคำแจ้ง "${
            typeLabel[request.request_type]
          }" ใช่หรือไม่? หากยกเลิกแล้วต้องแจ้งใหม่`}
          confirmText="ยกเลิกการแจ้ง"
          danger
          busy={cancelRequest.isPending}
          onConfirm={handleCancel}
          onClose={() => setCancelling(false)}
        />
      )}

      <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-2">
        <h3 className="font-semibold text-lg">เอกสารของฉัน</h3>
        {documents.length === 0 && (
          <span className="text-gray-400 text-sm">ยังไม่มีเอกสาร</span>
        )}
        {documents.map((d) => (
          <a
            key={d.doc_id}
            href={fileUrl(d.file_url)}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            📎 {d.doc_type}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["water", "electric"].map((t) => (
          <div key={t} className="border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">
              {t === "water" ? "ค่าน้ำ" : "ค่าไฟ"} (บาท/หน่วย)
            </div>
            <div className="text-xl font-semibold">
              {rates[t] ? fmtBaht(rates[t].rate_value) : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TenantDashboard;
