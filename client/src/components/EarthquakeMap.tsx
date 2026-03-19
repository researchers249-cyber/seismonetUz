/**
 * SEISMON — EarthquakeMap
 * Interactive Leaflet map centred on Central Asia.
 * Shows user location (blue pulsing marker) + earthquake CircleMarkers.
 */

import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import { useEffect } from "react"
import type { Earthquake } from "../types"
import { SEVERITY_COLORS } from "../lib/constants"
import { formatDistanceToNow } from "date-fns"
import "leaflet/dist/leaflet.css"

// ── helpers ───────────────────────────────────────────────────

function magnitudeToColor(magnitude: number): string {
  if (magnitude < 3) return SEVERITY_COLORS.low
  if (magnitude < 5) return SEVERITY_COLORS.medium
  if (magnitude < 7) return SEVERITY_COLORS.high
  return SEVERITY_COLORS.critical
}

// Recenter map when userLat/userLon become available
function RecenterView({ lat, lon }: { lat?: number; lon?: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat !== undefined && lon !== undefined) {
      map.setView([lat, lon], map.getZoom())
    }
  }, [lat, lon, map])
  return null
}

// ── props ─────────────────────────────────────────────────────

interface EarthquakeMapProps {
  earthquakes: Earthquake[]
  userLat?: number
  userLon?: number
}

// ── component ─────────────────────────────────────────────────

export function EarthquakeMap({ earthquakes, userLat, userLon }: EarthquakeMapProps) {
  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden">
      {/* Pulsing dot CSS for user location */}
      <style>{`
        @keyframes seismon-pulse {
          0%   { transform: scale(1);   opacity: 0.9; }
          50%  { transform: scale(1.6); opacity: 0.4; }
          100% { transform: scale(1);   opacity: 0.9; }
        }
        .seismon-user-pulse {
          animation: seismon-pulse 1.5s ease-in-out infinite;
          background: #3b82f6;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          border: 2px solid #fff;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.3);
        }
      `}</style>

      <MapContainer
        center={[41, 69]}
        zoom={5}
        className="w-full h-full min-h-[400px]"
        style={{ background: "#1a1a2e" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Recenter when GPS known */}
        <RecenterView lat={userLat} lon={userLon} />

        {/* User location */}
        {userLat !== undefined && userLon !== undefined && (
          <CircleMarker
            center={[userLat, userLon]}
            radius={8}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.9,
              weight: 2,
            }}
            className="seismon-user-pulse"
          >
            <Popup>
              <strong>Sizning joylashuvingiz</strong>
              <br />
              {userLat.toFixed(4)}, {userLon.toFixed(4)}
            </Popup>
          </CircleMarker>
        )}

        {/* Earthquake markers */}
        {earthquakes.map((eq) => (
          <CircleMarker
            key={eq.id}
            center={[eq.latitude, eq.longitude]}
            radius={Math.max(eq.magnitude * 4, 6)}
            pathOptions={{
              color: magnitudeToColor(eq.magnitude),
              fillColor: magnitudeToColor(eq.magnitude),
              fillOpacity: 0.55,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  M{eq.magnitude.toFixed(1)} — {eq.location}
                </div>
                <div style={{ fontSize: 13, color: "#555" }}>
                  <div>📍 {eq.latitude.toFixed(3)}, {eq.longitude.toFixed(3)}</div>
                  <div>🕒 {formatDistanceToNow(new Date(eq.timestamp), { addSuffix: true })}</div>
                  <div>🧭 Chuqurlik: {eq.depth} km</div>
                  <div>🔍 Manba: {eq.source.toUpperCase()}</div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
