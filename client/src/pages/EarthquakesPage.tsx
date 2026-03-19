import { useState } from "react";
import { useEarthquakeStore } from "../store/earthquakeStore";
import { useGeolocation } from "../hooks/useGeolocation";
import { EarthquakeList } from "../components/ui/EarthquakeList";
import { EarthquakeMap } from "../components/EarthquakeMap";

const MIN_MAGNITUDES = [0, 2, 3, 4, 5, 6];

export default function EarthquakesPage() {
  const earthquakes = useEarthquakeStore((s) => s.earthquakes);
  const geo = useGeolocation();
  const [minMag, setMinMag] = useState(0);
  const [showMap, setShowMap] = useState(true);

  const filtered = minMag > 0
    ? earthquakes.filter((eq) => eq.magnitude >= minMag)
    : earthquakes;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Zilzilalar</h1>
          <p className="text-gray-400">
            Ko'rsatilmoqda: {filtered.length} / {earthquakes.length} ta tadbir
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Min magnitude filter */}
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <span className="text-gray-400 text-sm">Min M:</span>
            <div className="flex gap-1">
              {MIN_MAGNITUDES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinMag(m)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    minMag === m
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {m === 0 ? "Barchasi" : `${m}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle map */}
          <button
            onClick={() => setShowMap((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showMap
                ? "bg-green-900/40 border-green-700 text-green-400"
                : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {showMap ? "🗺 Xaritani yashirish" : "🗺 Xaritani ko'rsatish"}
          </button>
        </div>
      </div>

      {/* Map */}
      {showMap && (
        <div className="h-[420px] rounded-xl overflow-hidden border border-gray-800">
          <EarthquakeMap
            earthquakes={filtered.slice(0, 200)}
            userLat={geo.lat ?? undefined}
            userLon={geo.lon ?? undefined}
          />
        </div>
      )}

      {/* List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <EarthquakeList earthquakes={filtered} />
      </div>
    </main>
  );
}
