import { describe, expect, it } from "vitest";
import { clearToken, getToken, setToken } from "./auth";

describe("token storage", () => {
  it("get คืน null เมื่อยังไม่ได้ set", () => {
    expect(getToken()).toBeNull();
  });

  it("set แล้ว get ได้ค่าเดิม", () => {
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
    expect(localStorage.getItem("eden_token")).toBe("abc.def.ghi");
  });

  it("clear ลบ token ทิ้ง", () => {
    setToken("x");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
