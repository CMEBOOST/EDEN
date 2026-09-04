import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../test/utils";
import * as api from "../lib/api";
import { useCreateTenant, useTenants } from "./tenants";

vi.mock("../lib/api");

beforeEach(() => vi.resetAllMocks());

describe("useTenants", () => {
  it("เริ่มที่ isPending แล้วโหลดรายชื่อจาก GET /tenants/", async () => {
    api.apiGet.mockResolvedValue([{ tenant_id: 1, full_name: "สมชาย" }]);

    const { result } = renderHook(() => useTenants(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.apiGet).toHaveBeenCalledWith("/tenants/");
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useCreateTenant", () => {
  it("ยิง POST /tenants/ พร้อม body ที่ส่งเข้า mutate", async () => {
    api.apiPost.mockResolvedValue({ tenant_id: 9 });

    const { result } = renderHook(() => useCreateTenant(), {
      wrapper: createWrapper(),
    });
    await result.current.mutateAsync({ full_name: "ผู้เช่าใหม่" });

    expect(api.apiPost).toHaveBeenCalledWith("/tenants/", {
      full_name: "ผู้เช่าใหม่",
    });
  });
});
