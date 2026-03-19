import { useState } from "react";
import { useEarthquakeStore } from "../store/earthquakeStore";
import { useAlertStore } from "../store/alertStore";
import { useDeviceStore } from "../store/deviceStore";
import { useWebSocket } from "../hooks/useWebSocket";
import { EarthquakeList } from "../components/ui/EarthquakeList";
import { SeismicChart } from "../components/SeismicChart";
import { SimulateButton } from "../components/SimulateButton";
import { AlertModal } from "../components/AlertModal";
import { DeviceCard } from "../components/ui/DeviceCard";

export default function HomePage() {
  const earthquakes = useEarthquakeStore((s) => s.earthquakes);
  const { activeAlert, dismissAlert } = useAlertStore();
  const devices = useDeviceStore((s) => s.devices);
  const { connected } = useWebSocket();
  const [chartRunning, setChartRunning] = useState(false);

  // Today's earthquakes
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = earthquakes.filter(
    (eq) => new Date(eq.timestamp) >= todayStart
  ).length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Alert modal */}
      <AlertModal alert={activeAlert} onClose={dismissAlert} />

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Bosh sahifa</h1>
        <p className="text-gray-400">Real-vaqtli zilzila monitoringi</p>
      </div>

      {/* Status cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Holat</p>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-400" : "bg-red-500"}`} />
            <span className="text-white font-semibold">{connected ? "Ulangan" : "Uzilgan"}</span>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Qurilmalar</p>
          <p className="text-white text-2xl font-bold">{devices.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Bugungi hodisalar</p>
          <p className="text-white text-2xl font-bold">{todayCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Jami (24s)</p>
          <p className="text-white text-2xl font-bold">{earthquakes.length}</p>
        </div>
      </div>

      {/* Devices list */}
      {devices.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Qurilmalar ro'yxati</h2>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((d) => (
              <DeviceCard key={d.deviceId} device={d} />
            ))}
          </div>
        </div>
      )}

      {/* Seismic chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Real-vaqt akselerometr</h2>
          <button
            onClick={() => setChartRunning((v) => !v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              chartRunning
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-green-700 hover:bg-green-600 text-white"
            }`}
          >
            {chartRunning ? "⏹ To'xtatish" : "▶ Real-vaqt tekshiruv"}
          </button>
        </div>
        <div className="p-4">
          <SeismicChart isRunning={chartRunning} />
        </div>
      </div>

      {/* Simulate + recent earthquakes side by side */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SimulateButton />
        </div>
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">So'nggi zilzilalar</h2>
          </div>
          <EarthquakeList earthquakes={earthquakes.slice(0, 10)} />
        </div>
      </div>
    </main>
  );
}
