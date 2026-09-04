import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { qk } from "./keys";

export const useRates = () =>
  useQuery({ queryKey: qk.rates, queryFn: () => apiGet("/rates/") });

export const useCurrentRates = (date) =>
  useQuery({
    queryKey: qk.currentRates(date),
    queryFn: () => apiGet(`/rates/current${date ? `?date=${date}` : ""}`),
  });

function useRatesInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["rates"] });
}

export function useCreateRate() {
  const invalidate = useRatesInvalidate();
  return useMutation({
    mutationFn: (body) => apiPost("/rates/", body),
    onSuccess: invalidate,
  });
}

export function useUpdateRate() {
  const invalidate = useRatesInvalidate();
  return useMutation({
    mutationFn: ({ id, body }) => apiPut(`/rates/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteRate() {
  const invalidate = useRatesInvalidate();
  return useMutation({
    mutationFn: (id) => apiDelete(`/rates/${id}`),
    onSuccess: invalidate,
  });
}
