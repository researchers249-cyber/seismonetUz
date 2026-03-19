interface StatusPillProps {
  online: boolean;
  label?: string;
}

export function StatusPill({ online, label }: StatusPillProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium",
        online
          ? "bg-green-900/60 text-green-400 ring-1 ring-green-700"
          : "bg-gray-800 text-gray-500 ring-1 ring-gray-700",
      ].join(" ")}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={[
            "relative inline-flex rounded-full h-2 w-2",
            online ? "bg-green-400" : "bg-gray-600",
          ].join(" ")}
        />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
