import { clearToken, getToken } from "./auth";

// base URL ของ backend — override ได้ด้วย env VITE_API_BASE (ไฟล์ .env)
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("auth:logout"));
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ไม่ใช่ JSON */
    }
    const msg =
      typeof detail === "string" ? detail : detail.message ?? "เกิดข้อผิดพลาด";
    const err = new Error(`${res.status}: ${msg}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

const jsonBody = (method) => (path, body) =>
  request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const apiGet = (path) => request(path);
export const apiPost = jsonBody("POST");
export const apiPut = jsonBody("PUT");
export const apiPatch = jsonBody("PATCH");
export const apiDelete = (path) => request(path, { method: "DELETE" });

// login: backend ใช้ OAuth2PasswordRequestForm -> ต้องส่งแบบ form-urlencoded
export const apiLogin = (username, password) =>
  request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });

// อัปโหลดไฟล์ 1 ไฟล์ -> { url, filename } (อย่าตั้ง Content-Type เอง)
export const apiUpload = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return request("/upload/", { method: "POST", body: fd });
};

// รวม base URL ให้ path ที่ backend คืนมา (เช่น "/uploads/x.png") -> ใช้กับ <img src>
export const fileUrl = (path) =>
  path?.startsWith("http") ? path : `${API_BASE}${path ?? ""}`;
