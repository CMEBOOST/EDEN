import adminIcon from "../../assets/adminIcon.png";
import maleIcon from "../../assets/maleIcon.png";
import femaleIcon from "../../assets/femaleIcon.png";
import { fileUrl } from "./api";

// รูปตั้งต้น (frontend-eden/assets/) — ใช้เป็นพรีเซ็ตให้เลือก
export const AVATAR_PRESETS = {
  admin: adminIcon,
  male: maleIcon,
  female: femaleIcon,
};

export const PRESET_OPTIONS = [
  ["male", "ทั่วไป (ชาย)"],
  ["female", "ทั่วไป (หญิง)"],
  ["admin", "ผู้ดูแล"],
];

// user.avatar_url: null | "admin"/"male"/"female" | "/uploads/<file>"
export function avatarSrc(user) {
  const v = user?.avatar_url;
  if (!v) return AVATAR_PRESETS[user?.role === "admin" ? "admin" : "male"];
  if (v.startsWith("/uploads")) return fileUrl(v);
  return AVATAR_PRESETS[v] ?? AVATAR_PRESETS.male;
}
