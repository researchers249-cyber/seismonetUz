import type { Device } from "../../types";
import { StatusPill } from "./StatusPill";
import { formatDistanceToNow } from "date-fns";

interface DeviceCardProps {
  device: Device;
}

function shortenId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 8) + "…" + id.slice(-4);
}

export function DeviceCard({ device }: DeviceCardProps) {
  const lastSeenAgo = formatDistanceToNow(new Date(device.lastSeen), {
    addSuffix: true,
  });

  const hasGps =
    device.latitude !== null && device.longitude !== null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-white font-mono text-sm font-medium truncate">
          {shortenId(device.deviceId)}
        </span>
        <StatusPill online={device.online} />
      </div>

      {/* GPS */}
      <div className="flex items-center gap-2 text-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={["h-4 w-4 flex-shrink-0", hasGps ? "text-green-400" : "text-gray-600"].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {hasGps ? (
          <span className="text-gray-300 tabular-nums">
            {device.latitude!.toFixed(4)}, {device.longitude!.toFixed(4)}
          </span>
        ) : (
          <span className="text-gray-600">GPS yo'q</span>
        )}
      </div>

      {/* Last seen */}
      <div className="text-xs text-gray-500">{lastSeenAgo}</div>
    </div>
  );
}
