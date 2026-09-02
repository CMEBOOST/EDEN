import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";
import { qk } from "./keys";

export const useRequests = (status) =>
  useQuery({
    queryKey: qk.requests(status),
    queryFn: () =>
      apiGet(`/contract-requests/${status ? `?status=${status}` : ""}`),
  });

function useRequestsInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["contract-requests"] });
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
}

export function useCreateRequest() {
  const invalidate = useRequestsInvalidate();
  return useMutation({
    mutationFn: (body) => apiPost("/contract-requests/", body),
    onSuccess: invalidate,
  });
}

export function useUpdateRequest() {
  const invalidate = useRequestsInvalidate();
  return useMutation({
    mutationFn: ({ id, body }) => apiPatch(`/contract-requests/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useCancelRequest() {
  const invalidate = useRequestsInvalidate();
  return useMutation({
    mutationFn: (id) => apiDelete(`/contract-requests/${id}`),
    onSuccess: invalidate,
  });
}
