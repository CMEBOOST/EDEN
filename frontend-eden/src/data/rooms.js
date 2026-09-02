import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { qk } from "./keys";

// options: { available?: bool, enabled?: bool }
export const useRooms = (options = {}) => {
  const { available = false, enabled = true } = options;
  return useQuery({
    queryKey: qk.rooms({ available }),
    queryFn: () => apiGet(`/rooms/${available ? "?available=true" : ""}`),
    enabled,
  });
};
