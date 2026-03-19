import { useEffect, useState } from "react";
import type { Alert } from "../../types";
import { formatDistanceToNow } from "date-fns";

interface AlertBannerProps {
  alert: Alert | null;
  onDismiss: () => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [alert]);

  if (!alert) return null;

  const timeAgo = formatDistanceToNow(new Date(alert.timestamp), {
    addSuffix: true,
  });

  const severityColors: Record<string, string> = {
    low: "bg-yellow-600 border-yellow-500",
    medium: "bg-orange-600 border-orange-500",
    high: "bg-red-700 border-red-500",
    critical: "bg-red-900 border-red-400",
  };

  const colorClass = severityColors[alert.severity] ?? severityColors.high;

  return (
    <div
      role="alert"
      className={[
        "w-full border-b px-4 py-3 text-white transition-all duration-500",
        colorClass,
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Pulsing icon */}
          <span className="relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>

          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">
              {alert.message}
            </p>
            <p className="text-xs text-white/80 mt-0.5">
              Radius: {alert.affectedRadiusKm} km &middot; {timeAgo}
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          aria-label="Ogohlantirishni yopish"
          className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/20 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
