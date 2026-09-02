import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";
import { qk } from "./keys";

export const useChecklists = (contractId) =>
  useQuery({
    queryKey: qk.checklists(contractId),
    queryFn: () => apiGet(`/contracts/${contractId}/checklists`),
    enabled: contractId != null && contractId !== "",
  });

function useChecklistInvalidate() {
  const qc = useQueryClient();
  // check-out ทำให้สัญญาถูกยุติ + คำขอเสร็จสิ้น → invalidate กว้างไว้ก่อน
  return (contractId) => {
    qc.invalidateQueries({ queryKey: qk.checklists(contractId) });
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["contract-requests"] });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
}

export function useCreateChecklist() {
  const invalidate = useChecklistInvalidate();
  return useMutation({
    mutationFn: ({ contractId, body }) =>
      apiPost(`/contracts/${contractId}/checklists`, body),
    onSuccess: (_data, { contractId }) => invalidate(contractId),
  });
}

export function useUpdateChecklist() {
  const invalidate = useChecklistInvalidate();
  return useMutation({
    mutationFn: ({ contractId, ccId, body }) =>
      apiPatch(`/contracts/${contractId}/checklists/${ccId}`, body),
    onSuccess: (_data, { contractId }) => invalidate(contractId),
  });
}

export function useDeleteChecklist() {
  const invalidate = useChecklistInvalidate();
  return useMutation({
    mutationFn: ({ contractId, ccId }) =>
      apiDelete(`/contracts/${contractId}/checklists/${ccId}`),
    onSuccess: (_data, { contractId }) => invalidate(contractId),
  });
}
