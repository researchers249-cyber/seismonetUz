import { useAlertStore } from "../store/alertStore";
import { formatDistanceToNow } from "date-fns";
import { AlertModal } from "../components/AlertModal";

export default function AlertsPage() {
  const { alerts, clearAll, activeAlert, dismissAlert } = useAlertStore();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Active alert modal */}
      <AlertModal alert={activeAlert} onClose={dismissAlert} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Ogohlantirishlar</h1>
          <p className="text-gray-400 mt-1">Jami: {alerts.length} ta</p>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
          >
            Hammasini tozalash
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-600">
          <p className="text-lg">Hozircha ogohlantirishlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{alert.message}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Radius: {alert.affectedRadiusKm} km &middot;{" "}
                    {formatDistanceToNow(new Date(alert.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <span
                  className={[
                    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold uppercase ring-1",
                    alert.severity === "critical"
                      ? "bg-red-900/60 text-red-400 ring-red-700"
                      : alert.severity === "high"
                        ? "bg-orange-900/60 text-orange-400 ring-orange-700"
                        : alert.severity === "medium"
                          ? "bg-yellow-900/60 text-yellow-400 ring-yellow-700"
                          : "bg-green-900/60 text-green-400 ring-green-700",
                  ].join(" ")}
                >
                  {alert.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
