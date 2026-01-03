"use client";

import { useMemo } from "react";

interface DataPoint {
  date: string;
  value: number | null;
}

interface ProgressChartProps {
  data: DataPoint[];
  label: string;
  color?: string;
  unit?: string;
}

export function ProgressChart({
  data,
  label,
  color = "#22c55e",
  unit = "",
}: ProgressChartProps) {
  const filtered = data.filter((d) => d.value !== null) as Array<{
    date: string;
    value: number;
  }>;

  const { points, minVal, maxVal, width, height, padding } = useMemo(() => {
    if (filtered.length === 0)
      return { points: "", minVal: 0, maxVal: 0, width: 0, height: 0, padding: 0 };

    const w = 600;
    const h = 200;
    const p = 40;

    const values = filtered.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pts = filtered
      .map((d, i) => {
        const x = p + (i / (filtered.length - 1 || 1)) * (w - p * 2);
        const y = h - p - ((d.value - min) / range) * (h - p * 2);
        return `${x},${y}`;
      })
      .join(" ");

    return { points: pts, minVal: min, maxVal: max, width: w, height: h, padding: p };
  }, [filtered]);

  if (filtered.length < 2) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        Not enough data to show chart. Need at least 2 measurements.
      </div>
    );
  }

  const firstVal = filtered[0].value;
  const lastVal = filtered[filtered.length - 1].value;
  const change = lastVal - firstVal;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">
            Current: <span className="font-semibold text-gray-900">{lastVal}{unit}</span>
          </span>
          <span
            className={`font-medium ${
              change < 0 ? "text-green-600" : change > 0 ? "text-orange-600" : "text-gray-500"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}
            {unit}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = height - padding - pct * (height - padding * 2);
          const val = minVal + pct * (maxVal - minVal);
          return (
            <g key={pct}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={padding - 5}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-400"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Date labels */}
        {filtered
          .filter(
            (_, i) =>
              i === 0 ||
              i === filtered.length - 1 ||
              i === Math.floor(filtered.length / 2)
          )
          .map((d, idx) => {
            const i = filtered.indexOf(d);
            const x =
              padding + (i / (filtered.length - 1 || 1)) * (width - padding * 2);
            return (
              <text
                key={idx}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] fill-gray-400"
              >
                {new Date(d.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </text>
            );
          })}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {filtered.map((d, i) => {
          const x =
            padding + (i / (filtered.length - 1 || 1)) * (width - padding * 2);
          const y =
            height -
            padding -
            ((d.value - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
          return (
            <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="2" />
          );
        })}
      </svg>
    </div>
  );
}
