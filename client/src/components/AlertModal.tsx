/**
 * SEISMON — AlertModal
 * Full-screen overlay shown whenever a new Alert arrives.
 * Calls navigator.vibrate for tactile feedback on mobile.
 */

import { useEffect } from "react"
import type { Alert, Severity } from "../types"
import { formatDistanceToNow } from "date-fns"

const SEVERITY_BG: Record<Severity, string> = {
  low: "border-green-500",
  medium: "border-yellow-400",
  high: "border-orange-400",
  critical: "border-red-500",
}

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Xavfsiz",
  medium: "Kuzatilmoqda",
  high: "Ogohlantirish",
  critical: "KRITIK",
}

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
}

interface AlertModalProps {
  alert: Alert | null
  onClose: () => void
}

export function AlertModal({ alert, onClose }: AlertModalProps) {
  // Vibrate on open (mobile)
  useEffect(() => {
    if (!alert) return
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500])
    }
  }, [alert])

  if (!alert) return null

  // Derive magnitude from message if available (fallback label)
  const magMatch = alert.message.match(/M([\d.]+)/)
  const magDisplay = magMatch ? magMatch[1] : "–"

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Card — stop propagation so clicking inside doesn't close */}
      <div
        className={`
          relative w-full max-w-md bg-gray-900 rounded-2xl border-2 shadow-2xl p-6
          ${SEVERITY_BG[alert.severity]}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Severity label */}
        <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${SEVERITY_COLOR[alert.severity]}`}>
          {SEVERITY_LABEL[alert.severity]}
        </div>

        {/* Magnitude big number */}
        <div className={`text-6xl font-extrabold leading-none mb-2 ${SEVERITY_COLOR[alert.severity]}`}>
          M{magDisplay}
        </div>

        {/* Message */}
        <p className="text-white text-base font-medium mb-4">{alert.message}</p>

        {/* Details */}
        <div className="text-gray-400 text-sm space-y-1 mb-6">
          <div>📍 Ta'sir radiusi: {alert.affectedRadiusKm} km</div>
          <div>🕒 {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</div>
          <div className="text-xs text-gray-600 break-all">ID: {alert.id}</div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors text-sm tracking-wide"
        >
          Tushunarli
        </button>
      </div>
    </div>
  )
}
