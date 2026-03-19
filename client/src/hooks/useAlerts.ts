import { useQuery } from "@tanstack/react-query";
import type { Alert } from "../types";

async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch("/api/alerts");
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.status}`);
  return res.json() as Promise<Alert[]>;
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    staleTime: 10_000,
  });
}
