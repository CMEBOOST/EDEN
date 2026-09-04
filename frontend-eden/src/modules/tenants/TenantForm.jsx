import { useEffect, useMemo, useState } from "react";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
} from "../../data/tenants";
import { useUsers } from "../../data/users";

const EMPTY = {
  user_id: "",
  full_name: "",
  phone: "",
  email: "",
  current_address: "",
  national_id_encrypted: "",
  emergency_contact: "",
};

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

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

// tenant = null -> โหมดเพิ่ม, tenant = object -> โหมดแก้ไข
function TenantForm({ tenant, onClose }) {
  const isEdit = Boolean(tenant);
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          user_id: String(tenant.user_id ?? ""),
          full_name: tenant.full_name ?? "",
          phone: tenant.phone ?? "",
          email: tenant.email ?? "",
          current_address: tenant.current_address ?? "",
          national_id_encrypted: tenant.national_id_encrypted ?? "",
          emergency_contact: tenant.emergency_contact ?? "",
        }
      : EMPTY
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { data: allUsers = [] } = useUsers();
  const { data: allTenants = [] } = useTenants();

  // บัญชีที่ลงทะเบียน tenant ได้: role = tenant, ยังเปิดใช้งาน, และยังไม่ผูกกับผู้เช่ารายอื่น
  const users = useMemo(() => {
    if (isEdit) return [];
    const taken = new Set(allTenants.map((t) => t.user_id));
    return allUsers.filter(
      (u) => u.role === "tenant" && u.is_active && !taken.has(u.user_id)
    );
  }, [isEdit, allUsers, allTenants]);

  // ปิดด้วยปุ่ม Esc
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const common = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        current_address: form.current_address.trim() || null,
        national_id_encrypted: form.national_id_encrypted.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
      };

      if (isEdit) {
        await updateTenant.mutateAsync({ id: tenant.tenant_id, body: common });
      } else {
        await createTenant.mutateAsync({
          ...common,
          user_id: Number(form.user_id),
        });
      }
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            {isEdit ? "แก้ไขผู้เช่า" : "เพิ่มผู้เช่า"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isEdit && (
            <Field label="บัญชีผู้ใช้" required>
              <select
                required
                value={form.user_id}
                onChange={set("user_id")}
                className={inputCls}
                disabled={users.length === 0}
              >
                <option value="">— เลือกบัญชี —</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.username} · #{u.user_id}
                  </option>
                ))}
              </select>
              {users.length === 0 && (
                <span className="text-xs text-amber-600">
                  ไม่มีบัญชีผู้เช่าที่ว่าง — สร้างผู้ใช้ role "ผู้เช่า"
                  ที่หน้าจัดการผู้ใช้ก่อน
                </span>
              )}
            </Field>
          )}

          <Field label="ชื่อ-สกุล" required>
            <input
              required
              value={form.full_name}
              onChange={set("full_name")}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="เบอร์โทร" required>
              <input
                required
                value={form.phone}
                onChange={set("phone")}
                className={inputCls}
              />
            </Field>
            <Field label="อีเมล" required>
              <input
                required
                type="email"
                value={form.email}
                onChange={set("email")}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="ที่อยู่ปัจจุบัน">
            <input
              value={form.current_address}
              onChange={set("current_address")}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="เลขบัตรประชาชน">
              <input
                value={form.national_id_encrypted}
                onChange={set("national_id_encrypted")}
                className={inputCls}
              />
            </Field>
            <Field label="ผู้ติดต่อฉุกเฉิน">
              <input
                value={form.emergency_contact}
                onChange={set("emergency_contact")}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TenantForm;
