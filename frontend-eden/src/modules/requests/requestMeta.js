// label / สี ใช้ร่วมกันในโมดูลคำแจ้งความจำนง

export const typeLabel = {
  renew: "ต่อสัญญา",
  terminate: "ยุติสัญญา",
};

export const typeStyle = {
  renew: "bg-sky-100 text-sky-700",
  terminate: "bg-red-100 text-red-700",
};

export const statusLabel = {
  pending: "รอดำเนินการ",
  accepted: "กำลังดำเนินการ",
  rejected: "ปฏิเสธ",
  completed: "เสร็จสิ้น",
};

export const statusStyle = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-sky-100 text-sky-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
};

export const OPEN_STATUSES = ["pending", "accepted"];
