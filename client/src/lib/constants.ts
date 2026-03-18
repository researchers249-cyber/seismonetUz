export const WS_EVENTS = {
  DEVICE_REGISTER: "DEVICE_REGISTER",
  ACCEL_DATA: "ACCEL_DATA",
  EARTHQUAKE_DETECTED: "EARTHQUAKE_DETECTED",
  ALERT_BROADCAST: "ALERT_BROADCAST",
  SIMULATE: "SIMULATE_EARTHQUAKE",
  DEVICE_LIST: "DEVICE_LIST_UPDATE",
  PING: "PING",
  PONG: "PONG",
} as const

export const SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const

export const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
}

export const API_BASE = "/api"
export const WS_URL = `ws://${window.location.host}/ws`
