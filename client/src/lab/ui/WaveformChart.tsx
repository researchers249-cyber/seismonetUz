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

const PHASE_BACKGROUND_ALPHA_VALUE = 0.2;

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
  const toRgba = (hex: string, alpha: number) => {
    const sanitized = hex.replace("#", "");
    const value =
      sanitized.length === 3
        ? sanitized
            .split("")
            .map((char) => char + char)
            .join("")
        : sanitized;
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const datasets = phaseVoltages?.length
    ? [
        ...phaseVoltages.map((phase) => ({
          label: phase.label,
          data: phase.data,
          borderColor: phase.color,
          backgroundColor: toRgba(phase.color, PHASE_BACKGROUND_ALPHA_VALUE),
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
