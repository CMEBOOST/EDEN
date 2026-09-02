import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  useProfile,
  useUpdateProfileAvatar,
  useUpdateProfilePassword,
  useUpdateProfileContact,
} from "../../data/profile";
import AvatarPicker from "../../components/AvatarPicker";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

const roleLabel = { admin: "ผู้ดูแลระบบ", staff: "พนักงาน", tenant: "ผู้เช่า" };

function Card({ title, children }) {
  return (
    <section className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2">
      {children}
    </div>
  );
}

/* ---------- การ์ดบัญชี (avatar + ข้อมูลอ่านอย่างเดียว) ---------- */
function AccountCard({ user, onSaved }) {
  const updateAvatar = useUpdateProfileAvatar();
  const [avatarValue, setAvatarValue] = useState(user.avatar_url ?? null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const busy = updateAvatar.isPending;

  const dirty = file || avatarValue !== (user.avatar_url ?? null);

  async function save() {
    setError(null);
    try {
      await updateAvatar.mutateAsync({ file, avatar_url: avatarValue });
      setFile(null);
      await onSaved();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Card title="บัญชี">
      <ErrorBanner>{error}</ErrorBanner>
      <AvatarPicker
        value={avatarValue}
        file={file}
        role={user.role}
        onChangeValue={setAvatarValue}
        onChangeFile={setFile}
      />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-500">ชื่อผู้ใช้</div>
          <div className="text-gray-800">{user.username}</div>
        </div>
        <div>
          <div className="text-gray-500">สิทธิ์</div>
          <div className="text-gray-800">
            {roleLabel[user.role] ?? user.role}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        เปลี่ยนชื่อผู้ใช้/สิทธิ์ ติดต่อผู้ดูแลระบบ
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={save}
          className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {busy ? "กำลังบันทึก..." : "บันทึกรูป"}
        </button>
      </div>
    </Card>
  );
}

/* ---------- การ์ดเปลี่ยนรหัสผ่าน ---------- */
function PasswordCard() {
  const updatePassword = useUpdateProfilePassword();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const busy = updatePassword.isPending;

  async function save(e) {
    e.preventDefault();
    if (nw.length < 6) return setError("รหัสผ่านใหม่อย่างน้อย 6 ตัว");
    if (nw !== confirm) return setError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
    setError(null);
    try {
      await updatePassword.mutateAsync({
        current_password: cur,
        new_password: nw,
      });
      setCur("");
      setNw("");
      setConfirm("");
      alert("เปลี่ยนรหัสผ่านแล้ว");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Card title="เปลี่ยนรหัสผ่าน">
      <ErrorBanner>{error}</ErrorBanner>
      <form onSubmit={save} className="flex flex-col gap-3">
        <Field label="รหัสผ่านเดิม">
          <input
            type="password"
            required
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="รหัสผ่านใหม่">
            <input
              type="password"
              required
              value={nw}
              onChange={(e) => setNw(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ยืนยันรหัสผ่านใหม่">
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </div>
      </form>
    </Card>
  );
}

/* ---------- การ์ดข้อมูลติดต่อ (เฉพาะผู้เช่า) ---------- */
function ContactCard({ tenant, onSaved }) {
  const [form, setForm] = useState({
    full_name: tenant.full_name ?? "",
    phone: tenant.phone ?? "",
    email: tenant.email ?? "",
    current_address: tenant.current_address ?? "",
    emergency_contact: tenant.emergency_contact ?? "",
  });
  const updateContact = useUpdateProfileContact();
  const [error, setError] = useState(null);
  const busy = updateContact.isPending;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setError(null);
    try {
      await updateContact.mutateAsync({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        current_address: form.current_address.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
      });
      await onSaved();
      alert("บันทึกข้อมูลติดต่อแล้ว");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Card title="ข้อมูลติดต่อ (ผู้เช่า)">
      <ErrorBanner>{error}</ErrorBanner>
      <form onSubmit={save} className="flex flex-col gap-3">
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
        <Field label="ผู้ติดต่อฉุกเฉิน">
          <input
            value={form.emergency_contact}
            onChange={set("emergency_contact")}
            className={inputCls}
          />
        </Field>
        <div className="text-sm">
          <div className="text-gray-500">เลขบัตรประชาชน</div>
          <div className="text-gray-400">
            {tenant.has_national_id
              ? "•••••••••••• (แก้ไขได้เฉพาะเจ้าหน้าที่)"
              : "ยังไม่มีข้อมูล — ติดต่อเจ้าหน้าที่"}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก..." : "บันทึกข้อมูลติดต่อ"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function Profile() {
  const { user, refreshUser } = useAuth();
  const { data, isPending, error, refetch } = useProfile();

  if (error)
    return (
      <div className="p-6 text-red-600 font-sans">
        โหลดข้อมูลไม่สำเร็จ: {error.message}
      </div>
    );
  if (isPending)
    return <div className="p-6 text-gray-400 font-sans">กำลังโหลด...</div>;

  return (
    <div className="flex flex-col gap-5 font-sans max-w-2xl">
      <h2 className="text-3xl">โปรไฟล์ของฉัน</h2>

      <AccountCard
        user={data.user ?? user}
        onSaved={async () => {
          await refreshUser();
          await refetch();
        }}
      />

      <PasswordCard />

      {data.tenant && (
        <ContactCard tenant={data.tenant} onSaved={refetch} />
      )}
    </div>
  );
}

export default Profile;
