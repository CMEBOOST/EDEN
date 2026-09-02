// map จาก pathname → รายการ breadcrumb: [{ label, to }] (to = null คือหน้าปัจจุบัน)
// เรียงจากเฉพาะเจาะจง → ทั่วไป
const RULES = [
  [/^\/$/, [["หน้าแรก", null]]],
  [/^\/profile$/, [["โปรไฟล์ของฉัน", null]]],
  [/^\/menu$/, [["เมนู", null]]],

  [/^\/tenants$/, [["ผู้เช่า", null]]],
  [/^\/tenants\/[^/]+$/, [["ผู้เช่า", "/tenants"], ["รายละเอียด", null]]],

  [/^\/contracts$/, [["สัญญาเช่า", null]]],
  [/^\/contracts\/new$/, [["สัญญาเช่า", "/contracts"], ["สร้างสัญญา", null]]],
  [/^\/contracts\/history$/, [["สัญญาเช่า", "/contracts"], ["ประวัติ", null]]],
  [
    /^\/contracts\/history\/[^/]+$/,
    [
      ["สัญญาเช่า", "/contracts"],
      ["ประวัติ", "/contracts/history"],
      ["รายละเอียด", null],
    ],
  ],
  [
    /^\/contracts\/[^/]+\/checkout$/,
    [["สัญญาเช่า", "/contracts"], ["ตรวจสภาพห้องออก", null]],
  ],
  [/^\/contracts\/[^/]+$/, [["สัญญาเช่า", "/contracts"], ["รายละเอียด", null]]],

  [/^\/rate$/, [["อัตราค่าบริการ", null]]],
  [/^\/users$/, [["จัดการผู้ใช้", null]]],
  [/^\/log$/, [["Audit Log", null]]],
];

export function crumbsFor(pathname) {
  const hit = RULES.find(([re]) => re.test(pathname));
  if (!hit) return [];
  return hit[1].map(([label, to]) => ({ label, to }));
}
