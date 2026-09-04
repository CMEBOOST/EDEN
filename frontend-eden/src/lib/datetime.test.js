import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTimestamp } from "./datetime";

const ISO = "2026-08-30T04:45:42.658474+00:00"; // = 11:45:42 เวลาไทย

describe("datetime formatters", () => {
  it("คืน '-' เมื่อ input ว่าง", () => {
    for (const fn of [formatDate, formatDateTime, formatTimestamp]) {
      expect(fn(null)).toBe("-");
      expect(fn(undefined)).toBe("-");
      expect(fn("")).toBe("-");
    }
  });

  it("formatTimestamp คืนเวลาไทยแบบ YYYY-MM-DD HH:MM:SS", () => {
    expect(formatTimestamp(ISO)).toBe("2026-08-30 11:45:42");
  });

  it("formatDateTime คืนถึงระดับนาที ไม่มีวินาที", () => {
    expect(formatDateTime(ISO)).toBe("30/08/2026 11:45");
  });

  it("formatDate คืนเฉพาะวันที่ (มีปี ค.ศ. 2026)", () => {
    expect(formatDate(ISO)).toContain("2026");
    expect(formatDate(ISO)).not.toContain(":");
  });
});
