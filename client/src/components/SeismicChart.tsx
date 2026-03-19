/**
 * SEISMON — SeismicChart
 * Real-time accelerometer line chart using Chart.js directly.
 * Reads from window.__accelData (set by useAccelerometer) every 100 ms.
 */

import { useEffect, useRef } from "react"
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js"

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
)

// Declare global window property set by useAccelerometer
declare global {
  interface Window {
    __accelData?: { timestamp: number; g: number }
  }
}

const MAX_POINTS = 200

interface SeismicChartProps {
  isRunning: boolean
}

export function SeismicChart({ isRunning }: SeismicChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── initialise chart ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: {
        labels: [] as string[],
        datasets: [
          {
            label: "g-kuch",
            data: [] as number[],
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.08)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { labels: { color: "#9ca3af" } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${(ctx.parsed.y ?? 0).toFixed(3)} g`,
            },
          },
        },
        scales: {
          x: {
            type: "category" as const,
            ticks: { color: "#6b7280", maxTicksLimit: 6 },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
          y: {
            title: { display: true, text: "g (9.81 m/s²)", color: "#6b7280" },
            ticks: { color: "#6b7280" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [])

  // ── data polling ────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const accel = window.__accelData
      const chart = chartRef.current
      if (!chart) return

      const now = new Date().toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      const g = accel
        ? accel.g
        : Math.random() * 0.04 - 0.02 // fallback: tiny noise when no sensor

      const labels = chart.data.labels as string[]
      const data = chart.data.datasets[0].data as number[]

      labels.push(now)
      data.push(g)

      if (labels.length > MAX_POINTS) {
        labels.shift()
        data.shift()
      }

      chart.update("none")
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning])

  return (
    <div className="relative w-full h-48">
      <canvas ref={canvasRef} />
    </div>
  )
}
