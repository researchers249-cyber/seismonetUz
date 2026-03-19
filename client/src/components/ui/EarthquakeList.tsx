import type { Earthquake } from "../../types";
import { SeverityBadge } from "./SeverityBadge";
import { formatDistanceToNow } from "date-fns";

interface EarthquakeListProps {
  earthquakes: Earthquake[];
}

export function EarthquakeList({ earthquakes }: EarthquakeListProps) {
  if (earthquakes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mb-3 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm">Zilzila ma'lumoti topilmadi</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {earthquakes.map((eq) => {
        const timeAgo = formatDistanceToNow(new Date(eq.timestamp), {
          addSuffix: true,
        });

        return (
          <div
            key={eq.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            {/* Severity badge */}
            <SeverityBadge magnitude={eq.magnitude} className="flex-shrink-0" />

            {/* Location & source */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{eq.location}</p>
              <p className="text-gray-500 text-xs uppercase tracking-wide mt-0.5">
                {eq.source}
              </p>
            </div>

            {/* Depth */}
            <div className="hidden sm:block text-center flex-shrink-0">
              <p className="text-gray-300 text-sm tabular-nums">{eq.depth} km</p>
              <p className="text-gray-600 text-xs">chuqurlik</p>
            </div>

            {/* Time */}
            <div className="flex-shrink-0 text-right">
              <p className="text-gray-400 text-xs whitespace-nowrap">{timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
