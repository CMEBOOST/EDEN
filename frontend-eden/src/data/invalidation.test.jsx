import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { qk } from "./keys";
import { useCreateContract } from "./contracts";
import { useCreateChecklist } from "./checklists";
import { useCreateRequest } from "./requests";
import { useCreateTenant, useDeactivateTenant } from "./tenants";
import { useCreateUser } from "./users";
import { useAddTenantDocument } from "./documents";
import { useCreateRate } from "./rates";
import { useUpdateProfileContact, useUpdateProfilePassword } from "./profile";

vi.mock("../lib/api");

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const spy = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, wrapper };
}

const keysHit = (spy) =>
  spy.mock.calls.map((c) => JSON.stringify(c[0].queryKey));

beforeEach(() => {
  vi.resetAllMocks();
  api.apiPost.mockResolvedValue({});
  api.apiPut.mockResolvedValue({});
  api.apiPatch.mockResolvedValue({});
  api.apiDelete.mockResolvedValue({});
});

describe("mutation invalidation rules", () => {
  it("useCreateContract → contracts, rooms, dashboard", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateContract(), { wrapper });
    await result.current.mutateAsync({});
    const k = keysHit(spy);
    expect(k).toEqual(
      expect.arrayContaining([
        JSON.stringify(["contracts"]),
        JSON.stringify(["rooms"]),
        JSON.stringify(qk.dashboard),
      ])
    );
  });

  it("useCreateChecklist → checklists(cid), contracts, contract-requests, dashboard", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateChecklist(), { wrapper });
    await result.current.mutateAsync({ contractId: 7, body: {} });
    const k = keysHit(spy);
    expect(k).toEqual(
      expect.arrayContaining([
        JSON.stringify(qk.checklists(7)),
        JSON.stringify(["contracts"]),
        JSON.stringify(["contract-requests"]),
        JSON.stringify(qk.dashboard),
      ])
    );
  });

  it("useCreateRequest → contract-requests, contracts, dashboard", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateRequest(), { wrapper });
    await result.current.mutateAsync({});
    const k = keysHit(spy);
    expect(k).toEqual(
      expect.arrayContaining([
        JSON.stringify(["contract-requests"]),
        JSON.stringify(["contracts"]),
        JSON.stringify(qk.dashboard),
      ])
    );
  });

  it("useCreateTenant → tenants, dashboard", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateTenant(), { wrapper });
    await result.current.mutateAsync({});
    const k = keysHit(spy);
    expect(k).toEqual(
      expect.arrayContaining([
        JSON.stringify(["tenants"]),
        JSON.stringify(qk.dashboard),
      ])
    );
  });

  it("useDeactivateTenant → tenants, users, dashboard", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useDeactivateTenant(), { wrapper });
    await result.current.mutateAsync(3);
    const k = keysHit(spy);
    expect(k).toEqual(
      expect.arrayContaining([
        JSON.stringify(["tenants"]),
        JSON.stringify(["users"]),
        JSON.stringify(qk.dashboard),
      ])
    );
  });

  it("useCreateUser → users, tenants", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateUser(), { wrapper });
    await result.current.mutateAsync({});
    const k = keysHit(spy);
    expect(k).toEqual(
      expect.arrayContaining([
        JSON.stringify(["users"]),
        JSON.stringify(["tenants"]),
      ])
    );
  });

  it("useAddTenantDocument → documents(tenantId) เท่านั้น", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useAddTenantDocument(), { wrapper });
    await result.current.mutateAsync({ tenantId: 12, body: {} });
    expect(keysHit(spy)).toEqual([JSON.stringify(qk.documents(12))]);
  });

  it("useCreateRate → rates เท่านั้น", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useCreateRate(), { wrapper });
    await result.current.mutateAsync({});
    expect(keysHit(spy)).toEqual([JSON.stringify(["rates"])]);
  });

  it("useUpdateProfileContact → profile", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfileContact(), { wrapper });
    await result.current.mutateAsync({});
    expect(keysHit(spy)).toEqual([JSON.stringify(qk.profile)]);
  });

  it("useUpdateProfilePassword → ไม่ invalidate อะไรเลย", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfilePassword(), {
      wrapper,
    });
    await result.current.mutateAsync({});
    expect(spy).not.toHaveBeenCalled();
  });
});
