import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTenant, useDeactivateTenant } from "../../data/tenants";
import { useUser } from "../../data/users";
import { useContracts } from "../../data/contracts";
import ConfirmDialog from "../../components/ConfirmDialog";
import ContractDocuments from "../contracts/ContractDocuments";
import TenantInfoSection from "./TenantInfoSection";
import TenantAccountSection from "./TenantAccountSection";
import TenantContractsSection from "./TenantContractsSection";

// หน้ารายละเอียดผู้เช่า — ข้อมูลผู้เช่า + บัญชีผู้ใช้ + สัญญา + เอกสาร
function TenantDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: tenant, isPending: loading, error } = useTenant(tenantId);
  const { data: linkedUser = null } = useUser(tenant?.user_id);
  const { data: contracts = [] } = useContracts({ tenant_id: tenantId });
  const deactivate = useDeactivateTenant();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    try {
      await deactivate.mutateAsync(tenantId);
      navigate("/tenants");
    } catch (e) {
      alert(`ปิดใช้งานไม่สำเร็จ: ${e.message}`);
      setConfirmDelete(false);
    }
  }

  if (loading)
    return <div className="p-6 text-gray-400 font-sans">กำลังโหลด...</div>;
  if (error || !tenant)
    return (
      <div className="p-6 font-sans flex flex-col gap-3">
        <div className="text-red-600">
          {error ? `โหลดข้อมูลไม่สำเร็จ: ${error.message}` : "ไม่พบผู้เช่า"}
        </div>
        <button
          type="button"
          onClick={() => navigate("/tenants")}
          className="self-start text-gray-500 hover:text-gray-800"
        >
          ← กลับ
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-5 font-sans max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/tenants")}
          className="text-gray-500 hover:text-gray-800"
        >
          ← กลับ
        </button>
        <h2 className="text-2xl font-semibold">ผู้เช่า: {tenant.full_name}</h2>
        {linkedUser && (
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
              linkedUser.is_active
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {linkedUser.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          บัญชี: {linkedUser?.username ?? `#${tenant.user_id}`}
          {" · "}
          {contracts.length} สัญญา
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 text-sm rounded text-red-600 border border-red-200 hover:bg-red-50"
          >
            ปิดใช้งานผู้เช่า
          </button>
        )}
      </div>

      <TenantInfoSection tenant={tenant} />
      <TenantAccountSection user={linkedUser} />
      <TenantContractsSection contracts={contracts} />
      <ContractDocuments tenantId={tenantId} />

      {confirmDelete && (
        <ConfirmDialog
          title="ปิดการใช้งานผู้เช่า"
          message={`ปิดการใช้งาน "${tenant.full_name}" ? บัญชีผู้ใช้จะเข้าสู่ระบบไม่ได้ (ข้อมูลยังเก็บไว้)`}
          confirmText="ปิดใช้งาน"
          danger
          busy={deactivate.isPending}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

export default TenantDetail;
