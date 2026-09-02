import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "../lib/api";
import { qk } from "./keys";

export const useUsers = () =>
  useQuery({ queryKey: qk.users, queryFn: () => apiGet("/users/") });

export const useUser = (id) =>
  useQuery({
    queryKey: qk.user(id),
    queryFn: () => apiGet(`/users/${id}`),
    enabled: id != null && id !== "",
  });

function useUsersInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["tenants"] });
  };
}

export function useCreateUser() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: (body) => apiPost("/users/", body),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, body }) => apiPatch(`/users/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useSetUserRole() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, role }) => apiPatch(`/users/${id}/role`, { role }),
    onSuccess: invalidate,
  });
}

export function useSetUserActive() {
  const invalidate = useUsersInvalidate();
  return useMutation({
    mutationFn: ({ id, is_active }) => apiPatch(`/users/${id}`, { is_active }),
    onSuccess: invalidate,
  });
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: ({ id, new_password }) =>
      apiPatch(`/users/${id}/password`, { new_password }),
  });
}
