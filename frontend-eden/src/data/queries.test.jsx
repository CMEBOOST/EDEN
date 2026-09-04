import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWrapper } from "../test/utils";
import * as api from "../lib/api";
import { useContract, useContracts } from "./contracts";
import { useRequests } from "./requests";
import { useRooms } from "./rooms";
import { useTenant } from "./tenants";
import { useAuditLogs } from "./audit";

vi.mock("../lib/api");

beforeEach(() => {
  vi.resetAllMocks();
  api.apiGet.mockResolvedValue([]);
});

async function firstUrl(hook) {
  renderHook(hook, { wrapper: createWrapper() });
  await waitFor(() => expect(api.apiGet).toHaveBeenCalled());
  return api.apiGet.mock.calls[0][0];
}

describe("query URL building", () => {
  it("useContracts รวม param + ตัด ค่าว่าง/null ทิ้ง", async () => {
    expect(
      await firstUrl(() =>
        useContracts({ finished: false, tenant_id: 3, room: "" })
      )
    ).toBe("/contracts/?finished=false&tenant_id=3");
  });

  it("useContracts() ไม่มี param → /contracts/", async () => {
    expect(await firstUrl(() => useContracts())).toBe("/contracts/");
  });

  it("useRequests(status) → ?status=, ไม่มี → ไม่มี query", async () => {
    expect(await firstUrl(() => useRequests("pending"))).toBe(
      "/contract-requests/?status=pending"
    );
    vi.resetAllMocks();
    api.apiGet.mockResolvedValue([]);
    expect(await firstUrl(() => useRequests())).toBe("/contract-requests/");
  });

  it("useRooms({available:true}) → ?available=true", async () => {
    expect(await firstUrl(() => useRooms({ available: true }))).toBe(
      "/rooms/?available=true"
    );
  });
});

describe("enabled guard", () => {
  it("useRooms({enabled:false}) ไม่ยิง", async () => {
    const { result } = renderHook(() => useRooms({ enabled: false }), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(api.apiGet).not.toHaveBeenCalled();
  });

  it("useTenant('') / useContract(null) ไม่ยิง", async () => {
    renderHook(() => useTenant(""), { wrapper: createWrapper() });
    renderHook(() => useContract(null), { wrapper: createWrapper() });
    expect(api.apiGet).not.toHaveBeenCalled();
  });
});

describe("useAuditLogs pagination", () => {
  it("หน้าแรก skip=0&limit=50 · page เต็ม 50 → hasNextPage", async () => {
    api.apiGet.mockResolvedValue(Array.from({ length: 50 }, () => ({})));
    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.apiGet.mock.calls[0][0]).toContain("skip=0&limit=50");
    expect(result.current.hasNextPage).toBe(true);
  });

  it("page < 50 → ไม่มีหน้าถัดไป", async () => {
    api.apiGet.mockResolvedValue([{}, {}]);
    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});
