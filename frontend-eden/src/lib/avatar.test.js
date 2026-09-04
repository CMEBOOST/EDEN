import { describe, expect, it } from "vitest";
import { AVATAR_PRESETS, avatarSrc } from "./avatar";
import { clearToken } from "./auth";

describe("avatarSrc", () => {
  it("null avatar + role admin → พรีเซ็ต admin", () => {
    expect(avatarSrc({ role: "admin" })).toBe(AVATAR_PRESETS.admin);
  });

  it("null avatar + role อื่น → พรีเซ็ต male", () => {
    expect(avatarSrc({ role: "staff" })).toBe(AVATAR_PRESETS.male);
    expect(avatarSrc(null)).toBe(AVATAR_PRESETS.male);
  });

  it("key พรีเซ็ตที่รู้จัก → รูปนั้น", () => {
    expect(avatarSrc({ avatar_url: "female" })).toBe(AVATAR_PRESETS.female);
  });

  it("key ไม่รู้จัก → fallback male", () => {
    expect(avatarSrc({ avatar_url: "purple" })).toBe(AVATAR_PRESETS.male);
  });

  it("path /uploads → ส่งผ่าน fileUrl (มี /uploads ใน URL)", () => {
    clearToken();
    expect(avatarSrc({ avatar_url: "/uploads/me.png" })).toContain(
      "/uploads/me.png"
    );
  });
});
