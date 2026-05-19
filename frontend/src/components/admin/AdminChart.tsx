"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface DoughnutChartProps {
  type: "doughnut";
  data: ChartData<"doughnut">;
  options?: ChartOptions<"doughnut">;
}

interface BarChartProps {
  type: "bar";
  data: ChartData<"bar">;
  options?: ChartOptions<"bar">;
}

type AdminChartProps = (DoughnutChartProps | BarChartProps) & {
  title: string;
  subtitle?: string;
};

const defaultDoughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "70%",
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "#94a3b8",
        padding: 16,
        font: { size: 12, family: "Inter, system-ui, sans-serif" },
        usePointStyle: true,
        pointStyleWidth: 8,
      },
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      borderColor: "#334155",
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
};

const defaultBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#f8fafc",
      bodyColor: "#cbd5e1",
      borderColor: "#334155",
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(148, 163, 184, 0.08)" },
      ticks: { color: "#64748b", font: { size: 11 } },
      border: { color: "rgba(148, 163, 184, 0.15)" },
    },
    y: {
      grid: { color: "rgba(148, 163, 184, 0.08)" },
      ticks: { color: "#64748b", font: { size: 11 }, stepSize: 1 },
      border: { color: "rgba(148, 163, 184, 0.15)" },
      beginAtZero: true,
    },
  },
};

export default function AdminChart(props: AdminChartProps) {
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{props.title}</h3>
        {props.subtitle && <p className="text-sm text-slate-400 mt-0.5">{props.subtitle}</p>}
      </div>
      <div className="h-64">
        {props.type === "doughnut" ? (
          <Doughnut
            data={props.data}
            options={{ ...defaultDoughnutOptions, ...props.options }}
          />
        ) : (
          <Bar
            data={props.data}
            options={{ ...defaultBarOptions, ...props.options }}
          />
        )}
      </div>
    </div>
  );
}
