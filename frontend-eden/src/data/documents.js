import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { qk } from "./keys";

export const useTenantDocuments = (tenantId) =>
  useQuery({
    queryKey: qk.documents(tenantId),
    queryFn: () => apiGet(`/tenants/${tenantId}/documents`),
    enabled: tenantId != null && tenantId !== "",
  });

export function useAddTenantDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, body }) =>
      apiPost(`/tenants/${tenantId}/documents`, body),
    onSuccess: (_data, { tenantId }) =>
      qc.invalidateQueries({ queryKey: qk.documents(tenantId) }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId }) => apiDelete(`/documents/${docId}`),
    onSuccess: (_data, { tenantId }) =>
      qc.invalidateQueries({ queryKey: qk.documents(tenantId) }),
  });
}
