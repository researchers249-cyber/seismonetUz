interface SeverityBadgeProps {
  magnitude: number;
  className?: string;
}

interface SeverityInfo {
  label: string;
  colorClass: string;
}

function getSeverityInfo(magnitude: number): SeverityInfo {
  if (magnitude < 3) {
    return { label: "Xavfsiz", colorClass: "bg-green-900/60 text-green-400 ring-green-700" };
  }
  if (magnitude < 5) {
    return { label: "Kuzatilmoqda", colorClass: "bg-yellow-900/60 text-yellow-400 ring-yellow-700" };
  }
  if (magnitude < 7) {
    return { label: "Ogohlantirish", colorClass: "bg-orange-900/60 text-orange-400 ring-orange-700" };
  }
  return { label: "Kritik", colorClass: "bg-red-900/60 text-red-400 ring-red-700" };
}

export function SeverityBadge({ magnitude, className = "" }: SeverityBadgeProps) {
  const { label, colorClass } = getSeverityInfo(magnitude);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1",
        colorClass,
        className,
      ].join(" ")}
    >
      <span className="font-bold tabular-nums">M{magnitude.toFixed(1)}</span>
      <span>{label}</span>
    </span>
  );
}
