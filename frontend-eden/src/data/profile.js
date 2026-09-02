import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiUpload } from "../lib/api";
import { qk } from "./keys";

export const useProfile = () =>
  useQuery({ queryKey: qk.profile, queryFn: () => apiGet("/profile/") });

export function useUpdateProfileAvatar() {
  const qc = useQueryClient();
  return useMutation({
    // file ที่รออัป → multipart, ไม่งั้น patch พรีเซ็ต/null
    mutationFn: ({ file, avatar_url }) =>
      file
        ? apiUpload(file, "/profile/avatar")
        : apiPatch("/profile/avatar", { avatar_url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
}

export function useUpdateProfilePassword() {
  return useMutation({
    mutationFn: (body) => apiPatch("/profile/password", body),
  });
}

export function useUpdateProfileContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPatch("/profile/tenant", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
}
