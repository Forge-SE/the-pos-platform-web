import { useId, useState } from "react"
import { formatMoney } from "./model"
import type { OperationsSummary } from "./model"

export type TrendPoint = { label: string; value: number }
export type Grouping = "Day" | "Week" | "Month"

function smoothPath(coords: Array<{ x: number; y: number }>) {
  if (!coords.length) return ""
  let path = `M ${coords[0].x},${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i += 1) {
    const current = coords[i]
    const next = coords[i + 1]
    const control = (current.x + next.x) / 2
    path += ` C ${control},${current.y} ${control},${next.y} ${next.x},${next.y}`
  }
  return path
}

/** The original preview curve, fill, grid and peak marker, scaled for live values. */
export function LineChart({
  points,
  height = 132,
  label,
}: {
  points: TrendPoint[]
  height?: number
  label: string
}) {
  const gradientId = useId()
  const [selected, setSelected] = useState<number | null>(null)
  const width = 320
  const pad = 6
  const plotHeight = height - 20
  const min = Math.min(0, ...points.map((point) => point.value))
  const max = Math.max(0, ...points.map((point) => point.value))
  const extent = max - min || 1
  const yFor = (value: number) => 8 + ((max - value) / extent) * plotHeight
  const coords = points.map((point, index) => ({
    x:
      points.length === 1
        ? width / 2
        : pad + (index / (points.length - 1)) * (width - pad * 2),
    y: yFor(point.value),
  }))
  const line = smoothPath(coords)
  const baseline = yFor(0)
  const area =
    coords.length > 1
      ? `${line} L ${coords[coords.length - 1].x},${baseline} L ${coords[0].x},${baseline} Z`
      : ""
  const gridlines = [0.25, 0.5, 0.75].map((ratio) => 8 + ratio * plotHeight)
  const peak = coords.reduce<{ x: number; y: number } | null>(
    (current, point) => (!current || point.y < current.y ? point : current),
    null
  )
  const labelStep = Math.max(1, Math.ceil(points.length / 7))
  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-secondary)"
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              stopColor="var(--color-secondary)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        {gridlines.map((y) => (
          <line
            key={y}
            x1={pad}
            x2={width - pad}
            y1={y}
            y2={y}
            stroke="var(--color-border)"
            strokeOpacity={0.5}
            strokeDasharray="3 4"
          />
        ))}
        {min < 0 && (
          <line
            data-zero-line="true"
            x1={pad}
            x2={width - pad}
            y1={baseline}
            y2={baseline}
            stroke="var(--color-border)"
            strokeOpacity={0.8}
          />
        )}
        <path data-chart="area" d={area} fill={`url(#${gradientId})`} />
        <path
          data-chart="line"
          d={line}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth={1}
          strokeLinecap="round"
        />
        {peak && (
          <>
            <circle
              cx={peak.x}
              cy={peak.y}
              r={7}
              fill="var(--color-secondary)"
              opacity={0.2}
            />
            <circle
              cx={peak.x}
              cy={peak.y}
              r={3.5}
              fill="var(--color-secondary)"
              stroke="var(--color-card)"
              strokeWidth={1.5}
            />
          </>
        )}
        {coords.map((point, index) => (
          <circle
            key={`${points[index].label}-${index}`}
            cx={point.x}
            cy={point.y}
            r={8}
            fill="transparent"
            tabIndex={0}
            aria-label={`${points[index].label}: ${formatMoney(points[index].value)}`}
            onMouseEnter={() => setSelected(index)}
            onMouseLeave={() => setSelected(null)}
            onFocus={() => setSelected(index)}
            onBlur={() => setSelected(null)}
          >
            <title>
              {points[index].label}: {formatMoney(points[index].value)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-muted-foreground">
        {points
          .filter(
            (_, index) => index % labelStep === 0 || index === points.length - 1
          )
          .map((point, index) => (
            <span key={`${point.label}-${index}`}>{point.label}</span>
          ))}
      </div>
      <p
        aria-live="polite"
        className="mt-2 min-h-4 text-xs text-muted-foreground tabular-nums"
      >
        {selected != null && points[selected]
          ? `${points[selected].label} · ${formatMoney(points[selected].value)}`
          : "Hover or focus a point for its amount."}
      </p>
    </div>
  )
}

export function groupTrend(
  trend: OperationsSummary["trend"],
  grouping: Grouping
): TrendPoint[] {
  const buckets = new Map<string, number>()
  for (const point of trend) {
    const day = new Date(`${point.date}T00:00:00Z`)
    if (grouping === "Week")
      day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))
    if (grouping === "Month") day.setUTCDate(1)
    const key = day.toISOString().slice(0, 10)
    buckets.set(key, (buckets.get(key) ?? 0) + point.netRevenue)
  }
  return [...buckets].map(([date, value]) => ({
    label: new Intl.DateTimeFormat("en-GH", {
      month: "short",
      ...(grouping === "Month"
        ? { year: "numeric" as const }
        : { day: "numeric" as const }),
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`)),
    value,
  }))
}

// Same five-column heatmap as the preview. The last window includes overnight
// orders, ensuring no live volume is lost from the compact representation.
export function heatmapCounts(
  cells: OperationsSummary["peakHours"]
): number[][] {
  const counts = Array.from({ length: 7 }, () => Array<number>(5).fill(0))
  for (const cell of cells) {
    const bucket =
      cell.hour < 9 || cell.hour >= 21 ? 4 : Math.floor((cell.hour - 9) / 3)
    counts[cell.weekday - 1][bucket] += cell.orderCount
  }
  return counts
}
