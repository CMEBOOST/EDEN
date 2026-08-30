// base URL ของ backend — override ได้ด้วย env VITE_API_BASE (ไฟล์ .env)
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ไม่ใช่ JSON */
    }
    // FastAPI ส่ง detail เป็น string หรือ object ก็ได้
    const msg = typeof detail === "string" ? detail : detail.message ?? "เกิดข้อผิดพลาด";
    const err = new Error(`${res.status}: ${msg}`);
    err.status = res.status;
    err.detail = detail; // object เต็ม (เช่น {message, existing_rate_id})
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) =>
  request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const apiPut = (path, body) =>
  request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const apiDelete = (path) => request(path, { method: "DELETE" });

// อัปโหลดไฟล์ 1 ไฟล์ -> { url, filename }
// อย่าตั้ง header Content-Type เอง ให้ browser ใส่ boundary ให้
export const apiUpload = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return request("/upload/", { method: "POST", body: fd });
};

// รวม base URL ให้ path ที่ backend คืนมา (เช่น "/uploads/x.png") -> ใช้กับ <img src>
export const fileUrl = (path) =>
  path?.startsWith("http") ? path : `${API_BASE}${path ?? ""}`;
