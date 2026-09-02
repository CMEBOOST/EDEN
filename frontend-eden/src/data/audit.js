import { useInfiniteQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { qk } from "./keys";

const PAGE = 50;

// filters = { userId, q }
export const useAuditLogs = (filters) =>
  useInfiniteQuery({
    queryKey: qk.auditLogs(filters),
    queryFn: ({ pageParam = 0 }) => {
      const params = new URLSearchParams({ skip: pageParam, limit: PAGE });
      if (filters?.userId) params.set("user_id", filters.userId);
      if (filters?.q?.trim()) params.set("q", filters.q.trim());
      return apiGet(`/audit-logs/?${params}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE ? allPages.flat().length : undefined,
  });
