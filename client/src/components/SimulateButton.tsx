/**
 * SEISMON — SimulateButton
 * Dev/test widget to fire a simulated earthquake via WebSocket.
 * Uses SIMULATE_EARTHQUAKE (WS_EVENTS.SIMULATE) message type.
 */

import { useState } from "react"
import { useWebSocket } from "../hooks/useWebSocket"
import { useGeolocation } from "../hooks/useGeolocation"
import { WS_EVENTS } from "../lib/constants"

export function SimulateButton() {
  const { send, connected } = useWebSocket()
  const geo = useGeolocation()

  const [magnitude, setMagnitude] = useState(5.0)
  const [depth, setDepth] = useState(10)
  const [useGps, setUseGps] = useState(true)
  const [manualLat, setManualLat] = useState("41.2995")
  const [manualLon, setManualLon] = useState("69.2401")
  const [sent, setSent] = useState(false)

  const lat = useGps && geo.lat !== null ? geo.lat : parseFloat(manualLat) || 41.2995
  const lon = useGps && geo.lon !== null ? geo.lon : parseFloat(manualLon) || 69.2401

  function handleSimulate() {
    send({
      type: WS_EVENTS.SIMULATE,
      magnitude,
      latitude: lat,
      longitude: lon,
      depth,
      location: `Simulyatsiya (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
    })
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="text-orange-400">⚠</span> Zilzila simulyatsiyasi
      </h3>

      {/* Magnitude slider */}
      <div>
        <label className="text-gray-400 text-xs block mb-1">
          Magnitud: <span className="text-white font-bold">M{magnitude.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={2.0}
          max={9.0}
          step={0.1}
          value={magnitude}
          onChange={(e) => setMagnitude(parseFloat(e.target.value))}
          className="w-full accent-orange-400"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-0.5">
          <span>2.0</span><span>9.0</span>
        </div>
      </div>

      {/* Depth */}
      <div>
        <label className="text-gray-400 text-xs block mb-1">
          Chuqurlik (km):
        </label>
        <input
          type="number"
          min={1}
          max={700}
          value={depth}
          onChange={(e) => setDepth(parseInt(e.target.value) || 10)}
          className="w-full bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm border border-gray-700 focus:outline-none focus:border-orange-400"
        />
      </div>

      {/* Location source */}
      <div>
        <label className="text-gray-400 text-xs block mb-1">Joylashuv:</label>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setUseGps(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              useGps ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            📡 GPS{geo.lat ? ` (${geo.lat.toFixed(2)})` : " (yo'q)"}
          </button>
          <button
            onClick={() => setUseGps(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !useGps ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            ✏️ Qo'lda
          </button>
        </div>

        {!useGps && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Kenglik (lat)"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs border border-gray-700 focus:outline-none focus:border-blue-400"
            />
            <input
              type="text"
              placeholder="Uzunlik (lon)"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs border border-gray-700 focus:outline-none focus:border-blue-400"
            />
          </div>
        )}
      </div>

      {/* Trigger button */}
      <button
        onClick={handleSimulate}
        disabled={!connected}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
          sent
            ? "bg-green-600 text-white"
            : connected
            ? "bg-orange-500 hover:bg-orange-400 text-white"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
        }`}
      >
        {sent ? "✓ Yuborildi!" : connected ? "🔴 Zilzilani simulyatsiya qilish" : "WebSocket ulanmagan"}
      </button>
    </div>
  )
}
