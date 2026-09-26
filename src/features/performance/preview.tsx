import { Fragment } from "react"
import { EyedropperSampleIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import {
  formatMoney,
  SAMPLE_BEST_SELLERS,
  SAMPLE_CATEGORIES,
  SAMPLE_HEATMAP,
  SAMPLE_HEATMAP_DAYS,
  SAMPLE_HEATMAP_HOURS,
  SAMPLE_RANGE_LABEL,
  SAMPLE_STAFF_STATS,
  SAMPLE_TREND_WEEK,
} from "@/features/performance/model"
import type { TrendPoint } from "@/features/performance/model"

/**
 * Single consistent marker for every placeholder: a Preview badge plus a
 * sample-range caption. All figures inside are deliberately synthetic
 * (round numbers, fixed sample range) so they can never be mistaken
 * for live performance data.
 */
export function PreviewCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-label={`${title} (preview with sample data)`}
      className="rounded-xl border border-dashed border-border/70 bg-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        >
          <EyedropperSampleIcon aria-hidden="true" className="size-3" />
          Preview
        </Badge>
      </div>
      <div className="mt-6">{children}</div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        {SAMPLE_RANGE_LABEL} · synthetic figures for layout only
      </p>
    </section>
  )
}

function smoothPath(coords: Array<{ x: number; y: number }>) {
  if (coords.length < 2) return ""
  let path = `M ${coords[0].x},${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i += 1) {
    const current = coords[i]
    const next = coords[i + 1]
    const control = (current.x + next.x) / 2
    path += ` C ${control},${current.y} ${control},${next.y} ${next.x},${next.y}`
  }
  return path
}

function LineChart({
  points,
  height = 132,
}: {
  points: TrendPoint[]
  height?: number
}) {
  const max = Math.max(...points.map((point) => point.value))
  const width = 320
  const pad = 6
  const plotHeight = height - 20
  const coords = points.map((point, index) => ({
    x: pad + (index / (points.length - 1)) * (width - pad * 2),
    y: 8 + (1 - point.value / max) * plotHeight,
  }))
  const line = smoothPath(coords)
  const area = `${line} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`
  const gradientId = `trend-${points.map((p) => p.label).join("")}`
  const gridlines = [0.25, 0.5, 0.75].map((ratio) => 8 + ratio * plotHeight)
  const peak = coords.reduce((a, b) => (b.y < a.y ? b : a), coords[0])
  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Sample trend chart"
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
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth={1}
          strokeLinecap="round"
        />
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
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  )
}

export function SalesTrendCard() {
  return (
    <PreviewCard
      title="Sales trend"
      description="Revenue across day, week, and month ranges."
    >
      <div
        role="tablist"
        aria-label="Sample range"
        className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1"
      >
        {["Day", "Week", "Month"].map((range) => (
          <span
            key={range}
            role="tab"
            aria-selected={range === "Week"}
            className={`rounded-md px-2 py-1.5 text-center text-xs font-semibold ${
              range === "Week"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground"
            }`}
          >
            {range}
          </span>
        ))}
      </div>
      <LineChart points={SAMPLE_TREND_WEEK} />
    </PreviewCard>
  )
}

export function BestSellersCard() {
  const max = Math.max(...SAMPLE_BEST_SELLERS.map((item) => item.orders))
  return (
    <PreviewCard
      title="Best-selling meals"
      description="Ranked by orders in the sample range."
    >
      <ol className="space-y-3">
        {SAMPLE_BEST_SELLERS.map((item, index) => (
          <li key={item.name} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.orders} orders
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-secondary"
                  style={{ width: `${Math.round((item.orders / max) * 100)}%` }}
                />
              </div>
            </div>
            <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
              {formatMoney(item.revenue)}
            </span>
          </li>
        ))}
      </ol>
    </PreviewCard>
  )
}

export function HeatmapCard() {
  return (
    <PreviewCard
      title="Order time heatmap"
      description="Order volume by day and hour. Also powers peak-hour analysis."
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[420px] grid-cols-[2.5rem_repeat(5,minmax(0,1fr))] gap-1.5">
          <span />
          {SAMPLE_HEATMAP_HOURS.map((hour) => (
            <span
              key={hour}
              className="text-center text-[10px] font-medium text-muted-foreground"
            >
              {hour}
            </span>
          ))}
          {SAMPLE_HEATMAP.map((row, day) => (
            <Fragment key={day}>
              <span className="self-center text-[10px] font-medium text-muted-foreground">
                {SAMPLE_HEATMAP_DAYS[day]}
              </span>
              {row.map((intensity, hour) => (
                <span
                  key={`${day}-${hour}`}
                  title={`${SAMPLE_HEATMAP_DAYS[day]} ${SAMPLE_HEATMAP_HOURS[hour]}: level ${intensity}`}
                  className="h-8 rounded-md bg-secondary"
                  style={{ opacity: 0.12 + intensity * 0.22 }}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        Quiet
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="h-3 w-3 rounded bg-secondary"
            style={{ opacity: 0.12 + level * 0.22 }}
          />
        ))}
        Busy
      </div>
    </PreviewCard>
  )
}

export function CategoryCard() {
  return (
    <PreviewCard
      title="Category performance"
      description="Share of revenue by menu category."
    >
      <ul className="space-y-4">
        {SAMPLE_CATEGORIES.map((category) => (
          <li key={category.name}>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{category.name}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {category.share}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-secondary"
                style={{ width: `${category.share}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </PreviewCard>
  )
}

export function DiscountVoidCard() {
  const rows = [
    { label: "Discounts given", value: formatMoney(50000), note: "10 orders" },
    { label: "Voids", value: formatMoney(20000), note: "4 orders" },
    { label: "Net impact", value: formatMoney(70000), note: "Sample total" },
  ]
  return (
    <PreviewCard
      title="Discount & void impact"
      description="How much margin markdowns cost in the sample range."
    >
      <dl className="divide-y divide-border/60">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
          >
            <div>
              <dt className="text-sm font-medium">{row.label}</dt>
              <dd className="text-xs text-muted-foreground">{row.note}</dd>
            </div>
            <dd className="text-sm font-semibold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </PreviewCard>
  )
}

export function VarianceCard() {
  const lastClose = {
    expected: 100000,
    counted: 99500,
    variance: -500,
    flagged: false,
  }
  const trend: TrendPoint[] = [
    { label: "W1", value: 500 },
    { label: "W2", value: 1200 },
    { label: "W3", value: 300 },
    { label: "W4", value: 800 },
  ]
  return (
    <PreviewCard
      title="Reconciliation & variance"
      description="Last close versus expected, plus variance history."
    >
      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Expected", value: formatMoney(lastClose.expected) },
          { label: "Counted", value: formatMoney(lastClose.counted) },
          { label: "Variance", value: formatMoney(lastClose.variance) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-muted/35 px-2 py-3">
            <dt className="text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              {stat.label}
            </dt>
            <dd className="mt-1 truncate text-sm font-semibold tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        {lastClose.flagged ? "Flagged for review." : "Within tolerance."}{" "}
        Variance history:
      </p>
      <div className="mt-2">
        <LineChart points={trend} height={90} />
      </div>
    </PreviewCard>
  )
}

export function StaffLeaderboardCard() {
  const max = Math.max(...SAMPLE_STAFF_STATS.map((s) => s.orders))
  return (
    <PreviewCard
      title="Staff performance"
      description="Orders handled and discount frequency per person."
    >
      <ol className="space-y-3">
        {SAMPLE_STAFF_STATS.map((person, index) => (
          <li key={person.name} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{person.name}</p>
                <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {person.orders} orders · {person.discounts} discounts
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-secondary"
                  style={{
                    width: `${Math.round((person.orders / max) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </PreviewCard>
  )
}

export function RepeatRateCard() {
  return (
    <PreviewCard
      title="Customer repeat rate"
      description="Share of customers ordering more than once."
    >
      <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
        40%
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[40%] rounded-full bg-secondary" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        100 sample customers · 40 returning
      </p>
    </PreviewCard>
  )
}

export function TaxCard() {
  return (
    <PreviewCard
      title="Tax & service charges"
      description="Order-level tax reporting."
    >
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Sample subtotal</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(500000)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Sample tax (3%)</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(15000)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border/60 pt-2">
          <dt className="font-medium">Sample total</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(515000)}</dd>
        </div>
      </dl>
    </PreviewCard>
  )
}
