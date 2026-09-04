import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useContract, useDeleteContract } from "../../data/contracts";
import { useTenant } from "../../data/tenants";
import ConfirmDialog from "../../components/ConfirmDialog";
import ContractInfoSection from "./ContractInfoSection";
import ChecklistSection from "./ChecklistSection";
import ContractDocuments from "./ContractDocuments";

const statusStyle = {
  draft: "bg-gray-100 text-gray-500",
  active: "bg-green-100 text-green-700",
  expired: "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
};
const statusLabel = {
  draft: "ร่าง",
  active: "ใช้งาน",
  expired: "หมดอายุ",
  terminated: "ยกเลิก",
};

// หน้ารายละเอียดสัญญา — ข้อมูลสัญญา + บันทึกสภาพห้อง + เอกสารแนบ
// readOnly = เปิดจากหน้าประวัติสัญญาเช่า — ดูอย่างเดียว ไม่มีปุ่มแก้/เพิ่ม/ลบ
function ContractDetail({ readOnly = false }) {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const backTo = readOnly ? "/contracts/history" : "/contracts";

  const { data: contract, isPending: loading, error } = useContract(contractId);
  const { data: tenant = null } = useTenant(contract?.tenant_id);
  const deleteContract = useDeleteContract();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    try {
      await deleteContract.mutateAsync(contractId);
      navigate("/contracts");
    } catch (e) {
      alert(`ลบไม่สำเร็จ: ${e.message}`);
      setConfirmDelete(false);
    }
  }

  if (loading)
    return <div className="p-6 text-gray-400 font-sans">กำลังโหลด...</div>;
  if (error || !contract)
    return (
      <div className="p-6 font-sans flex flex-col gap-3">
        <div className="text-red-600">{error?.message ?? "ไม่พบสัญญา"}</div>
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="self-start text-gray-500 hover:text-gray-800"
        >
          ← กลับหน้าสัญญา
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-5 font-sans max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="text-gray-500 hover:text-gray-800"
        >
          ← กลับ
        </button>
        <h2 className="text-2xl font-semibold">
          สัญญา #{contract.contract_id}
        </h2>
        {readOnly && (
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            ประวัติ · อ่านอย่างเดียว
          </span>
        )}
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
            statusStyle[contract.status] ?? "bg-gray-100 text-gray-500"
          }`}
        >
          {statusLabel[contract.status] ?? contract.status}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          ผู้เช่า: {tenant?.full_name ?? `#${contract.tenant_id}`}
          {" · "}ห้อง {contract.room_id ?? "-"}
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/contracts/${contractId}/checkout`)}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              ตรวจสภาพห้องออก
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-sm rounded text-red-600 border border-red-200 hover:bg-red-50"
              >
                ลบสัญญา
              </button>
            )}
          </div>
        )}
      </div>

      <ContractInfoSection contract={contract} readOnly={readOnly} />
      <ChecklistSection contractId={contractId} readOnly={readOnly} />
      <ContractDocuments tenantId={contract.tenant_id} readOnly={readOnly} />

      {confirmDelete && (
        <ConfirmDialog
          title="ลบสัญญา"
          message={`ต้องการลบสัญญา #${contractId} ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`}
          confirmText="ลบ"
          danger
          busy={deleteContract.isPending}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

export default ContractDetail;
