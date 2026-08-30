// จัดรูปแบบเวลาให้อ่านง่ายตอนแสดงผล
// backend เก็บเป็น ISO 8601 + timezone เช่น "2026-08-30T04:45:42.658474+00:00"
// ฟังก์ชันพวกนี้จะแปลงเป็นเวลาไทย (Asia/Bangkok)
//
// ใช้ "th-TH-u-ca-gregory" = ภาษาไทย + ปฏิทิน ค.ศ. (ไม่ใช่ พ.ศ.)
// ถ้าอยากได้ พ.ศ. เปลี่ยนเป็น "th-TH" เฉย ๆ

const TZ = "Asia/Bangkok";
const LOCALE = "th-TH-u-ca-gregory";

/** "30/08/2026 11:45" — วันและเวลาแบบสั้น (ถึงนาที) */
export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString(LOCALE, {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "2026-08-30 11:45:42" — รูปแบบเดียวกับที่เห็นในฐานข้อมูล */
export function formatTimestamp(value) {
  if (!value) return "-";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (t) => parts.find((x) => x.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** "30 ส.ค. 2026" — เฉพาะวันที่ */
export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(LOCALE, {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
