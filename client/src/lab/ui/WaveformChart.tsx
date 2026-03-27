import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface PhaseVoltage {
  label: string;
  data: number[];
  color: string;
}

interface WaveformChartProps {
  labels: string[];
  voltage: number[];
  current: number[];
  phaseVoltages?: PhaseVoltage[];
}

export function WaveformChart({
  labels,
  voltage,
  current,
  phaseVoltages,
}: WaveformChartProps) {
  const datasets = phaseVoltages?.length
    ? [
        ...phaseVoltages.map((phase) => ({
          label: phase.label,
          data: phase.data,
          borderColor: phase.color,
          backgroundColor: `${phase.color}33`,
          tension: 0.35,
          pointRadius: 0,
        })),
        {
          label: "Tok (A)",
          data: current,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.2)",
          tension: 0.35,
          pointRadius: 0,
        },
      ]
    : [
        {
          label: "Kuchlanish (V)",
          data: voltage,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.2)",
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: "Tok (A)",
          data: current,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.2)",
          tension: 0.35,
          pointRadius: 0,
        },
      ];
  return (
    <Line
      data={{
        labels,
        datasets,
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#d1d5db" } },
        },
        scales: {
          x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
          y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(148, 163, 184, 0.1)" } },
        },
      }}
    />
  );
}
