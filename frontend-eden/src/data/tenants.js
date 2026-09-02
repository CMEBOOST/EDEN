import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { qk } from "./keys";

export const useTenants = () =>
  useQuery({ queryKey: qk.tenants, queryFn: () => apiGet("/tenants/") });

export const useTenant = (id) =>
  useQuery({
    queryKey: qk.tenant(id),
    queryFn: () => apiGet(`/tenants/${id}`),
    enabled: id != null && id !== "",
  });

function useTenantInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["tenants"] });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
}

export function useCreateTenant() {
  const invalidate = useTenantInvalidate();
  return useMutation({
    mutationFn: (body) => apiPost("/tenants/", body),
    onSuccess: invalidate,
  });
}

export function useUpdateTenant() {
  const invalidate = useTenantInvalidate();
  return useMutation({
    mutationFn: ({ id, body }) => apiPut(`/tenants/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeactivateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiDelete(`/tenants/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}
