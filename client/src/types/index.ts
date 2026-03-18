// ============================================================
// SEISMON — TypeScript type definitions
// All API & WebSocket contracts for the earthquake warning system
// ============================================================

/** Data source identifier for earthquake events */
export type EarthquakeSource = "usgs" | "emsc" | "device" | "simulated";

/** Earthquake event received from backend */
export interface Earthquake {
  id: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  location: string;
  timestamp: string;
  source: EarthquakeSource;
}

/** Severity level for alerts */
export type Severity = "low" | "medium" | "high" | "critical";

/** Alert generated from a detected earthquake */
export interface Alert {
  id: string;
  earthquakeId: string;
  severity: Severity;
  message: string;
  timestamp: string;
  affectedRadiusKm: number;
}

/** Registered IoT sensor device */
export interface Device {
  deviceId: string;
  latitude: number | null;
  longitude: number | null;
  lastSeen: string;
  online: boolean;
}

/** Accelerometer signal payload from a device */
export interface SignalData {
  deviceId: string;
  x: number;
  y: number;
  z: number;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
}

// ============================================================
// WebSocket message types — discriminated union on `type` field
// ============================================================

export interface WSDeviceRegister {
  type: "DEVICE_REGISTER";
  deviceId: string;
  lat?: number;
  lon?: number;
}

export interface WSAccelData {
  type: "ACCEL_DATA";
  data: SignalData;
}

export interface WSEarthquakeDetected {
  type: "EARTHQUAKE_DETECTED";
  earthquake: Earthquake;
  alert: Alert;
}

export interface WSAlertBroadcast {
  type: "ALERT_BROADCAST";
  alert: Alert;
}

export interface WSSimulateEarthquake {
  type: "SIMULATE_EARTHQUAKE";
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  location: string;
}

export interface WSDeviceListUpdate {
  type: "DEVICE_LIST_UPDATE";
  devices: Device[];
}

export interface WSPing {
  type: "PING";
}

export interface WSPong {
  type: "PONG";
}

/** Union of all possible WebSocket messages */
export type WSMessage =
  | WSDeviceRegister
  | WSAccelData
  | WSEarthquakeDetected
  | WSAlertBroadcast
  | WSSimulateEarthquake
  | WSDeviceListUpdate
  | WSPing
  | WSPong;

/** Extract the `type` string literal from the union */
export type WSMessageType = WSMessage["type"];

// ============================================================
// Helper type guards for runtime message discrimination
// ============================================================

export function isWSMessage(msg: unknown): msg is WSMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    typeof (msg as WSMessage).type === "string"
  );
}

export function isEarthquakeDetected(
  msg: WSMessage,
): msg is WSEarthquakeDetected {
  return msg.type === "EARTHQUAKE_DETECTED";
}

export function isAlertBroadcast(msg: WSMessage): msg is WSAlertBroadcast {
  return msg.type === "ALERT_BROADCAST";
}

export function isDeviceListUpdate(msg: WSMessage): msg is WSDeviceListUpdate {
  return msg.type === "DEVICE_LIST_UPDATE";
}

// ============================================================
// API response wrappers (generic)
// ============================================================

/** Standard paginated API response envelope */
export interface ApiResponse<T> {
  data: T;
  total?: number;
  timestamp: string;
}

/** API error shape */
export interface ApiError {
  detail: string;
  status: number;
}
