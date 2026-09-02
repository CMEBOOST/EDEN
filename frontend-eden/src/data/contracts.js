import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { qk } from "./keys";

const buildQuery = (params) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const useContracts = (params) =>
  useQuery({
    queryKey: qk.contracts(params),
    queryFn: () => apiGet(`/contracts/${buildQuery(params)}`),
  });

export const useContract = (id) =>
  useQuery({
    queryKey: qk.contract(id),
    queryFn: () => apiGet(`/contracts/${id}`),
    enabled: id != null && id !== "",
  });

function useContractsInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
}

export function useCreateContract() {
  const invalidate = useContractsInvalidate();
  return useMutation({
    mutationFn: (body) => apiPost("/contracts/", body),
    onSuccess: invalidate,
  });
}

export function useUpdateContract() {
  const invalidate = useContractsInvalidate();
  return useMutation({
    mutationFn: ({ id, body }) => apiPut(`/contracts/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteContract() {
  const invalidate = useContractsInvalidate();
  return useMutation({
    mutationFn: (id) => apiDelete(`/contracts/${id}`),
    onSuccess: invalidate,
  });
}
