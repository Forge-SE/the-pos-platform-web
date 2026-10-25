import { formatMoney } from "@/features/menu/model"
import { EmptyState } from "@/components/content-state"

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export interface DayPoint {
  day: string
  orderCount: number
  revenue: number
  subscriptionCount?: number
  subscriptionRevenue?: number
}

export interface SharePoint {
  label: string
  orderCount: number
  revenue: number
}

function compactCedis(pesewas: number) {
  const cedis = pesewas / 100
  if (Math.abs(cedis) >= 1000) return `GHS ${(cedis / 1000).toFixed(1)}k`
  return `GHS ${Math.round(cedis)}`
}

function dayLabel(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`)
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date)
}

export function TrendChart({ points }: { points: DayPoint[] }) {
  const width = 720
  const height = 260
  const pad = { top: 18, right: 52, bottom: 36, left: 36 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxOrders = Math.max(1, ...points.map((point) => point.orderCount))
  const maxRevenue = Math.max(
    1,
    ...points.map((point) =>
      Math.max(point.revenue, point.subscriptionRevenue ?? 0)
    )
  )
  const slot = points.length ? innerW / points.length : innerW
  const barWidth = Math.max(2, Math.min(18, slot * 0.55))

  const orderY = (count: number) =>
    pad.top + innerH - (count / maxOrders) * innerH
  const revenueY = (amount: number) =>
    pad.top + innerH - (amount / maxRevenue) * innerH
  const xAt = (index: number) => pad.left + slot * index + slot / 2

  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xAt(index)} ${revenueY(point.revenue)}`
    )
    .join(" ")
  const subscriptionLine = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xAt(index)} ${revenueY(point.subscriptionRevenue ?? 0)}`
    )
    .join(" ")
  const area =
    points.length > 0
      ? `${line} L ${xAt(points.length - 1)} ${pad.top + innerH} L ${xAt(0)} ${pad.top + innerH} Z`
      : ""
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))
  const grid = [0, 0.5, 1]

  return (
    <figure className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          Orders, revenue, and subscriptions
        </span>
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-chart-1" />
            Orders
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-chart-4" />
            Order revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-chart-5" />
            Subscriptions
          </span>
        </span>
      </figcaption>
      {points.length === 0 ? (
        <EmptyState
          title="Nothing in this range."
          description="Choose a different date range or adjust the filters."
        />
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Orders and revenue across ${points.length} days, ending ${dayLabel(points[points.length - 1].day)}`}
          className="mt-3 h-64 w-full"
        >
          {grid.map((step) => {
            const y = pad.top + innerH - step * innerH
            return (
              <g key={step}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                />
                <text
                  x={4}
                  y={y + 4}
                  fill="var(--muted-foreground)"
                  fontSize="11"
                >
                  {Math.round(maxOrders * step)}
                </text>
                <text
                  x={width - 4}
                  y={y + 4}
                  fill="var(--muted-foreground)"
                  fontSize="11"
                  textAnchor="end"
                >
                  {compactCedis(maxRevenue * step)}
                </text>
              </g>
            )
          })}
          {points.map((point, index) => (
            <g key={point.day}>
              <rect
                x={xAt(index) - barWidth / 2}
                y={orderY(point.orderCount)}
                width={barWidth}
                height={Math.max(
                  0,
                  pad.top + innerH - orderY(point.orderCount)
                )}
                rx="2"
                fill="var(--chart-1)"
                opacity="0.85"
              >
                <title>
                  {dayLabel(point.day)}: {point.orderCount} orders,{" "}
                  {formatMoney(point.revenue)} order revenue,{" "}
                  {point.subscriptionCount ?? 0} subscription payments,{" "}
                  {formatMoney(point.subscriptionRevenue ?? 0)}
                </title>
              </rect>
              {index % labelEvery === 0 && (
                <text
                  x={xAt(index)}
                  y={height - 10}
                  fill="var(--muted-foreground)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {dayLabel(point.day)}
                </text>
              )}
            </g>
          ))}
          <path d={area} fill="var(--chart-4)" opacity="0.12" />
          <path
            d={line}
            fill="none"
            stroke="var(--chart-4)"
            strokeWidth="2.5"
          />
          <path
            d={subscriptionLine}
            fill="none"
            stroke="var(--chart-5)"
            strokeWidth="2.5"
          />
          {points.map((point, index) => (
            <circle
              key={`${point.day}-dot`}
              cx={xAt(index)}
              cy={revenueY(point.revenue)}
              r={points.length > 40 ? 0 : 3}
              fill="var(--chart-4)"
            >
              <title>
                {dayLabel(point.day)}: {formatMoney(point.revenue)} order
                revenue
              </title>
            </circle>
          ))}
          {points.map((point, index) => (
            <circle
              key={`${point.day}-subscription`}
              cx={xAt(index)}
              cy={revenueY(point.subscriptionRevenue ?? 0)}
              r={points.length > 40 ? 0 : 3}
              fill="var(--chart-5)"
            >
              <title>
                {dayLabel(point.day)}: {point.subscriptionCount ?? 0}{" "}
                subscription payments,{" "}
                {formatMoney(point.subscriptionRevenue ?? 0)}
              </title>
            </circle>
          ))}
        </svg>
      )}
    </figure>
  )
}

export function ShareBars({
  title,
  rows,
  valueLabel,
  countLabel = "orders",
}: {
  title: string
  rows: SharePoint[]
  valueLabel: string
  countLabel?: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.revenue))
  return (
    <figure className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <figcaption className="text-sm font-semibold">{title}</figcaption>
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing in this range."
          description="Choose a different date range or adjust the filters."
        />
      ) : (
        <ul className="mt-4 space-y-3" aria-label={title}>
          {rows.map((row, index) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{row.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {formatMoney(row.revenue)}
                  <span className="ml-2 text-xs">
                    {row.orderCount} {countLabel}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (row.revenue / max) * 100)}%`,
                    background: chartColors[index % chartColors.length],
                  }}
                  role="img"
                  aria-label={`${row.label} ${valueLabel} ${formatMoney(row.revenue)}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

export function ShareDonut({
  title,
  rows,
}: {
  title: string
  rows: SharePoint[]
}) {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0)
  let cursor = 0
  const gradient = total
    ? `conic-gradient(${rows
        .map((row, index) => {
          const start = cursor
          cursor += (row.revenue / total) * 100
          return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`
        })
        .join(", ")})`
    : "var(--muted)"

  return (
    <figure className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <figcaption className="text-sm font-semibold">{title}</figcaption>
      {rows.length === 0 || total === 0 ? (
        <EmptyState
          title="Nothing in this range."
          description="Choose a different date range or adjust the filters."
        />
      ) : (
        <div className="mt-4 grid items-center gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <div
            role="img"
            aria-label={`${title}, ${formatMoney(total)} in total`}
            className="relative mx-auto flex size-36 items-center justify-center rounded-full"
            style={{ background: gradient }}
          >
            <div className="flex size-20 flex-col items-center justify-center rounded-full bg-card">
              <span className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Total
              </span>
              <span className="max-w-16 truncate text-sm font-semibold tabular-nums">
                {formatMoney(total)}
              </span>
            </div>
          </div>
          <ul className="space-y-2">
            {rows.map((row, index) => {
              const share = Math.round((row.revenue / total) * 100)
              return (
                <li key={row.label} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      background: chartColors[index % chartColors.length],
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {share}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </figure>
  )
}
