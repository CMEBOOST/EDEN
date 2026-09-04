import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiLogin, apiPost, fileUrl } from "./api";
import { clearToken, setToken } from "./auth";

afterEach(() => clearToken());

// ── fileUrl ──────────────────────────────────────────────────────────────────
describe("fileUrl", () => {
  it("คืน '' เมื่อ path ว่าง", () => {
    expect(fileUrl("")).toBe("");
    expect(fileUrl(null)).toBe("");
  });

  it("ปล่อย URL ที่ขึ้นต้น http ผ่านตรง ๆ", () => {
    expect(fileUrl("https://cdn.example/x.png")).toBe(
      "https://cdn.example/x.png"
    );
  });

  it("ต่อ ?token= เมื่อมี token", () => {
    setToken("tok123");
    expect(fileUrl("/uploads/a.png")).toContain("/uploads/a.png?token=tok123");
  });

  it("ใช้ &token= เมื่อ path มี ? อยู่แล้ว", () => {
    setToken("tok123");
    expect(fileUrl("/uploads/a.png?v=2")).toContain("?v=2&token=tok123");
  });

  it("ไม่ต่อ token เมื่อไม่มี token", () => {
    expect(fileUrl("/uploads/a.png")).not.toContain("token=");
  });
});

// ── request wrapper ──────────────────────────────────────────────────────────
function stubFetch({
  ok = true,
  status = 200,
  statusText = "OK",
  body,
  throwJson,
}) {
  const res = {
    ok,
    status,
    statusText,
    json: throwJson
      ? () => Promise.reject(new Error("not json"))
      : () => Promise.resolve(body),
  };
  const fn = vi.fn().mockResolvedValue(res);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("request wrapper", () => {
  it("แนบ base URL + คืน body JSON", async () => {
    const fetchFn = stubFetch({ body: { ok: 1 } });
    const out = await apiGet("/things");
    expect(out).toEqual({ ok: 1 });
    expect(fetchFn.mock.calls[0][0]).toMatch(/\/things$/);
  });

  it("แนบ Authorization: Bearer เมื่อมี token", async () => {
    setToken("jwt-abc");
    const fetchFn = stubFetch({ body: {} });
    await apiGet("/me");
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer jwt-abc"
    );
  });

  it("204 → คืน null", async () => {
    stubFetch({ status: 204, body: undefined });
    expect(await apiGet("/x")).toBeNull();
  });

  it("401 → clearToken + dispatch auth:logout + throw", async () => {
    setToken("dead");
    const dispatch = vi.spyOn(window, "dispatchEvent");
    stubFetch({ ok: false, status: 401, body: { detail: "expired" } });

    await expect(apiGet("/x")).rejects.toThrow();
    expect(localStorage.getItem("eden_token")).toBeNull();
    expect(dispatch.mock.calls.some(([e]) => e.type === "auth:logout")).toBe(
      true
    );
  });

  it("non-ok → throw Error ที่มี .status/.detail และ message '<status>: <detail>'", async () => {
    stubFetch({ ok: false, status: 400, body: { detail: "ชื่อซ้ำ" } });
    await expect(apiGet("/x")).rejects.toMatchObject({
      status: 400,
      detail: "ชื่อซ้ำ",
      message: "400: ชื่อซ้ำ",
    });
  });

  it("non-ok body ไม่ใช่ JSON → ใช้ statusText", async () => {
    stubFetch({
      ok: false,
      status: 500,
      statusText: "Server Error",
      throwJson: true,
    });
    await expect(apiGet("/x")).rejects.toThrow("500: Server Error");
  });

  it("apiPost → method POST + Content-Type application/json + body JSON", async () => {
    const fetchFn = stubFetch({ body: {} });
    await apiPost("/things", { a: 1 });
    const [, opts] = fetchFn.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("apiLogin → form-urlencoded + body URLSearchParams", async () => {
    const fetchFn = stubFetch({ body: { access_token: "t" } });
    await apiLogin("bob", "pw");
    const [, opts] = fetchFn.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );
    expect(opts.body).toBeInstanceOf(URLSearchParams);
    expect(opts.body.get("username")).toBe("bob");
  });
});
