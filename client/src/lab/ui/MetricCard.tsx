interface MetricCardProps {
  label: string;
  value: string;
  tone?: "info" | "success" | "danger";
}

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-100",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-100",
};

export function MetricCard({ label, value, tone = "info" }: MetricCardProps) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${toneStyles[tone]}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-base font-semibold text-white">{value}</div>
    </div>
  );
}
