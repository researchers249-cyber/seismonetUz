import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "Noma'lum vaqt"
  try {
    return format(parseISO(dateString), "dd MMM yyyy, HH:mm")
  } catch {
    return "Noma'lum vaqt"
  }
}

export function formatMagnitude(val: number): string {
  return val.toFixed(1)
}

export function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S"
  const lonDir = lon >= 0 ? "E" : "W"
  return `${Math.abs(lat).toFixed(3)}${latDir}, ${Math.abs(lon).toFixed(3)}${lonDir}`
}

export function getMagnitudeLevel(
  mag: number
): "low" | "medium" | "high" | "critical" {
  if (mag < 3) return "low"
  if (mag < 5) return "medium"
  if (mag < 7) return "high"
  return "critical"
}
