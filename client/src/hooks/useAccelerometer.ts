/**
 * SEISMON — useAccelerometer hook
 *
 * Reads the device's accelerometer via the DeviceMotionEvent API and
 * streams readings over WebSocket as ACCEL_DATA messages.
 *
 * Features:
 *  - iOS 13+ permission request flow (DeviceMotionEvent.requestPermission)
 *  - Configurable sampling rate via throttle interval
 *  - Exposes latest reading for local UI (e.g. SeismicChart)
 *  - Graceful fallback for unsupported browsers
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { SignalData } from "../types"
import { useDeviceStore } from "../store/deviceStore"

/** Target sampling rate: 20 Hz → 50 ms between samples */
const INTERVAL_MS = 50

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported"

export interface AccelReading {
  x: number
  y: number
  z: number
  timestamp: number
}

export interface UseAccelerometerReturn {
  /** Whether the browser supports DeviceMotionEvent */
  supported: boolean
  /** Current permission state */
  permission: PermissionState
  /** Request motion permission (required on iOS 13+). No-op if already granted. */
  requestPermission: () => Promise<void>
  /** Latest raw accelerometer reading, or null before any event */
  latest: AccelReading | null
}

export function useAccelerometer(
  send: (message: Record<string, unknown>) => void,
): UseAccelerometerReturn {
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState<PermissionState>("prompt")
  const [latest, setLatest] = useState<AccelReading | null>(null)

  const lastSentRef = useRef(0)
  const myDeviceId = useDeviceStore((s: { myDeviceId: string }) => s.myDeviceId)

  // ── feature detection ────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      setSupported(false)
      setPermission("unsupported")
    }
  }, [])

  // ── iOS 13+ permission request ───────────────────────

  const requestPermission = useCallback(async () => {
    if (!supported) return

    // On iOS 13+ the API requires a user-gesture-gated permission request
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">
    }

    if (typeof DME.requestPermission === "function") {
      try {
        const result = await DME.requestPermission()
        setPermission(result === "granted" ? "granted" : "denied")
      } catch {
        // User dismissed the dialog, or it was called outside a gesture
        setPermission("denied")
      }
    } else {
      // Non-iOS browsers — permission is implicit
      setPermission("granted")
    }
  }, [supported])

  // ── motion event listener ────────────────────────────

  useEffect(() => {
    if (permission !== "granted") return

    const handler = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity
      if (!accel) return

      const x = accel.x ?? 0
      const y = accel.y ?? 0
      const z = accel.z ?? 0
      const now = Date.now()

      // Always update local state for UI rendering
      const reading: AccelReading = { x, y, z, timestamp: now }
      setLatest(reading)

      // Expose on window for SeismicChart (if present)
      ;(window as unknown as Record<string, unknown>).__accelData = reading

      // Throttle WS sends to INTERVAL_MS
      if (now - lastSentRef.current < INTERVAL_MS) return
      lastSentRef.current = now

      const payload: { type: string; data: SignalData } = {
        type: "ACCEL_DATA",
        data: {
          deviceId: myDeviceId,
          x,
          y,
          z,
          timestamp: new Date(now).toISOString(),
          latitude: null,
          longitude: null,
        },
      }

      // Attach geolocation if available
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            payload.data.latitude = pos.coords.latitude
            payload.data.longitude = pos.coords.longitude
            send(payload)
          },
          () => {
            // Geolocation unavailable/denied — send without coords
            send(payload)
          },
          { maximumAge: 10_000, timeout: 2_000 },
        )
      } else {
        send(payload)
      }
    }

    window.addEventListener("devicemotion", handler)
    return () => {
      window.removeEventListener("devicemotion", handler)
    }
  }, [permission, send, myDeviceId])

  return { supported, permission, requestPermission, latest }
}
