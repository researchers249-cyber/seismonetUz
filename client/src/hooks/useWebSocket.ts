/**
 * SEISMON — useWebSocket hook
 *
 * Manages a single WebSocket connection to the SEISMON backend with:
 *  - automatic reconnection using exponential backoff (1s → 30s)
 *  - type-safe message dispatch via discriminated union on `type`
 *  - integration with Zustand stores (earthquake, alert, device)
 *  - ping/pong keep-alive
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useDeviceStore } from "../store/deviceStore"
import { useEarthquakeStore } from "../store/earthquakeStore"
import { useAlertStore } from "../store/alertStore"
import { WS_URL } from "../lib/constants"
import type { WSMessage } from "../types"
import { isWSMessage } from "../types"

/** Minimum reconnect delay in ms */
const MIN_DELAY = 1_000
/** Maximum reconnect delay in ms */
const MAX_DELAY = 30_000
/** Ping interval to keep connection alive (ms) */
const PING_INTERVAL = 25_000

export interface UseWebSocketReturn {
  /** Send a JSON-serialisable message to the server */
  send: (message: Record<string, unknown>) => void
  /** Whether the WebSocket is currently open */
  connected: boolean
  /** Count of reconnection attempts since last successful connect */
  reconnectAttempts: number
}

export function useWebSocket(): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null)
  const reconnectDelay = useRef(MIN_DELAY)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const [connected, setConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Stable references to store actions (never change)
  const myDeviceId = useDeviceStore((s: { myDeviceId: string }) => s.myDeviceId)
  const setDevices = useDeviceStore((s: { setDevices: (list: import("../types").Device[]) => void }) => s.setDevices)
  const addEarthquake = useEarthquakeStore((s: { addEarthquake: (eq: import("../types").Earthquake) => void }) => s.addEarthquake)
  const addAlert = useAlertStore((s: { addAlert: (alert: import("../types").Alert) => void }) => s.addAlert)

  // ── send helper ──────────────────────────────────────────

  const send = useCallback((message: Record<string, unknown>) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    }
  }, [])

  // ── message dispatcher ─────────────────────────────────

  const dispatch = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "EARTHQUAKE_DETECTED":
          addEarthquake(msg.earthquake)
          addAlert(msg.alert)
          break

        case "ALERT_BROADCAST":
          addAlert(msg.alert)
          break

        case "DEVICE_LIST_UPDATE":
          setDevices(msg.devices)
          break

        case "PONG":
          // keep-alive acknowledged — nothing to do
          break

        // Client-only outbound types that the server never sends back
        case "DEVICE_REGISTER":
        case "ACCEL_DATA":
        case "SIMULATE_EARTHQUAKE":
        case "PING":
          break

        default: {
          const _exhaustive: never = msg
          console.warn("[SEISMON] Unhandled WS message:", _exhaustive)
        }
      }
    },
    [addEarthquake, addAlert, setDevices],
  )

  // ── connection logic ───────────────────────────────────

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    if (pingTimer.current) {
      clearInterval(pingTimer.current)
      pingTimer.current = null
    }
  }, [])

  const connect = useCallback(() => {
    // Guard against multiple opening attempts
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) {
      return
    }

    try {
      const socket = new WebSocket(WS_URL)
      ws.current = socket

      socket.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setReconnectAttempts(0)
        reconnectDelay.current = MIN_DELAY

        // Register this device
        send({
          type: "DEVICE_REGISTER",
          deviceId: myDeviceId,
        })

        // Start ping/pong keep-alive
        pingTimer.current = setInterval(() => {
          send({ type: "PING" })
        }, PING_INTERVAL)
      }

      socket.onmessage = (event: MessageEvent) => {
        try {
          const data: unknown = JSON.parse(event.data as string)
          if (isWSMessage(data)) {
            dispatch(data)
          } else {
            console.warn("[SEISMON] Received non-WSMessage:", data)
          }
        } catch (err) {
          console.error("[SEISMON] Failed to parse WS message:", err)
        }
      }

      socket.onerror = (event) => {
        console.error("[SEISMON] WebSocket error:", event)
      }

      socket.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        clearTimers()

        // Exponential back-off reconnect
        const delay = reconnectDelay.current
        reconnectDelay.current = Math.min(delay * 2, MAX_DELAY)
        setReconnectAttempts((prev: number) => prev + 1)

        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect()
        }, delay)
      }
    } catch (err) {
      console.error("[SEISMON] Failed to create WebSocket:", err)
    }
  }, [myDeviceId, send, dispatch, clearTimers])

  // ── lifecycle ──────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimers()
      if (ws.current) {
        ws.current.onclose = null // prevent reconnect on intentional close
        ws.current.close()
        ws.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { send, connected, reconnectAttempts }
}
