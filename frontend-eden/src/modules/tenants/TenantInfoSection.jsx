import { useState } from "react";
import { apiPut } from "../../lib/api";
import { formatDate } from "../../lib/datetime";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800">{children}</span>
    </div>
  );
}

function maskNationalId(v) {
  if (!v) return "-";
  const s = String(v);
  return s.length <= 4 ? s : `••••••••${s.slice(-4)}`;
}

// section ข้อมูลผู้เช่า — โหมดดู + สลับเป็นโหมดแก้ (PUT /tenants/{id})
function TenantInfoSection({ tenant, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function startEdit() {
    setForm({
      full_name: tenant.full_name ?? "",
      phone: tenant.phone ?? "",
      email: tenant.email ?? "",
      current_address: tenant.current_address ?? "",
      national_id_encrypted: tenant.national_id_encrypted ?? "",
      emergency_contact: tenant.emergency_contact ?? "",
    });
    setError(null);
    setEditing(true);
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiPut(`/tenants/${tenant.tenant_id}`, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        current_address: form.current_address.trim() || null,
        national_id_encrypted: form.national_id_encrypted.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
      });
      onSaved?.(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">ข้อมูลผู้เช่า</h3>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            แก้ไข
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
          {error}
        </div>
      )}

      {!editing ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Row label="ชื่อ-สกุล">{tenant.full_name}</Row>
          <Row label="เบอร์โทร">{tenant.phone || "-"}</Row>
          <Row label="อีเมล">{tenant.email || "-"}</Row>
          <Row label="ที่อยู่ปัจจุบัน">{tenant.current_address || "-"}</Row>
          <Row label="ผู้ติดต่อฉุกเฉิน">{tenant.emergency_contact || "-"}</Row>
          <Row label="เพิ่มเมื่อ">{formatDate(tenant.created_at)}</Row>
          <Row label="เลขบัตรประชาชน">
            {maskNationalId(tenant.national_id_encrypted)}
          </Row>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="ชื่อ-สกุล">
            <input
              required
              value={form.full_name}
              onChange={set("full_name")}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="เบอร์โทร">
              <input
                required
                value={form.phone}
                onChange={set("phone")}
                className={inputCls}
              />
            </Field>
            <Field label="อีเมล">
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

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
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
      )}
    </section>
  );
}

export default TenantInfoSection;
