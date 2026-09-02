import { useEffect, useState } from "react";
import { apiUpload } from "../../lib/api";
import { useUpdateUser } from "../../data/users";
import AvatarPicker from "../../components/AvatarPicker";

const inputCls =
  "border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 w-full";

function UserEditModal({ user, onClose }) {
  const updateUser = useUpdateUser();
  const [username, setUsername] = useState(user.username);
  // avatarValue: string | null — ค่าที่จะส่ง (พรีเซ็ต/null); file = ไฟล์ที่รออัป
  const [avatarValue, setAvatarValue] = useState(user.avatar_url ?? null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const patch = {};
      if (username.trim() && username.trim() !== user.username)
        patch.username = username.trim();
      if (file) {
        patch.avatar_url = (await apiUpload(file)).url;
      } else if (avatarValue !== (user.avatar_url ?? null)) {
        patch.avatar_url = avatarValue;
      }

      if (Object.keys(patch).length === 0) {
        onClose?.();
        return;
      }
      await updateUser.mutateAsync({ id: user.user_id, body: patch });
      onClose?.();
    } catch (err) {
      setError(err.status === 409 ? "username นี้มีอยู่แล้ว" : err.message);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">แก้ไขผู้ใช้</h3>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AvatarPicker
            value={avatarValue}
            file={file}
            role={user.role}
            onChangeValue={setAvatarValue}
            onChangeFile={setFile}
          />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">ชื่อผู้ใช้</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserEditModal;
