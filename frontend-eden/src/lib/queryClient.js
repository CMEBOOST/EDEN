import { QueryClient } from "@tanstack/react-query";

// QueryClient เดียวของทั้งแอป — ชั้น cache กลางสำหรับข้อมูลจาก backend
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // ถือว่า fresh 30 วิ — กัน refetch ถี่ตอนสลับหน้า
      gcTime: 5 * 60_000,
      retry: 1,
    },
  },
});

// api.js ยิง event นี้เมื่อเจอ 401 (token หมดอายุ / ออกจากระบบ)
// ล้าง cache ทิ้ง กัน session ใหม่เห็นข้อมูลค้างของคนเดิม
window.addEventListener("auth:logout", () => queryClient.clear());
