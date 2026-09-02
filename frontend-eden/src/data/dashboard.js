import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { qk } from "./keys";

export const useDashboard = () =>
  useQuery({ queryKey: qk.dashboard, queryFn: () => apiGet("/dashboard/") });
