import { useQuery } from "@tanstack/react-query";
import type { Earthquake } from "../types";
import { useEarthquakeStore } from "../store/earthquakeStore";

async function fetchEarthquakes(): Promise<Earthquake[]> {
  const res = await fetch("/api/earthquakes");
  if (!res.ok) throw new Error(`Failed to fetch earthquakes: ${res.status}`);
  return res.json() as Promise<Earthquake[]>;
}

export function useEarthquakes() {
  const setEarthquakes = useEarthquakeStore((s) => s.setEarthquakes);

  return useQuery({
    queryKey: ["earthquakes"],
    queryFn: fetchEarthquakes,
    staleTime: 30_000,
    refetchInterval: 60_000,
    select: (data) => {
      setEarthquakes(data);
      return data;
    },
  });
}
