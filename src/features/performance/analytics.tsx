import { Fragment } from "react"
import type { ReactNode } from "react"
import { LoadingState } from "@/components/loading-state"
import { EmptyState } from "@/components/content-state"
import { useUrlState } from "@/lib/url-state"
import { formatMoney } from "./model"
import type { OperationsSummary, SalesToday } from "./model"
import { LineChart, groupTrend, heatmapCounts } from "./charts"
import type { Grouping } from "./charts"

function AnalyticsCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      className="content-region min-w-0 rounded-lg border border-border/70 bg-card p-5 sm:p-6"
      aria-label={title}
    >
      <h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  )
}
function NoSales() {
  return (
    <EmptyState
      title="No completed sales"
      description="Completed, paid orders and zero-total comps appear here for the selected dates."
    />
  )
}
function Trend({ trend }: { trend: OperationsSummary["trend"] }) {
  const [param, setParam] = useUrlState("trendGroup")
  const grouping: Grouping =
    param === "Day" || param === "Month" ? param : "Week"
  return (
    <>
      <div
        role="tablist"
        aria-label="Trend grouping"
        className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1"
      >
        {(["Day", "Week", "Month"] as const).map((range) => (
          <button
            key={range}
            type="button"
            role="tab"
            aria-selected={range === grouping}
            onClick={() => setParam(range)}
            className={`rounded-md px-2 py-1.5 text-center text-xs font-semibold ${range === grouping ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"}`}
          >
            {range}
          </button>
        ))}
      </div>
      <LineChart
        points={groupTrend(trend, grouping)}
        label="Net revenue trend"
      />
    </>
  )
}
function Rank({ index, children }: { index: number; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums">
        {index + 1}
      </span>
      {children}
    </li>
  )
}
function Bar({
  value,
  max,
  thick = false,
}: {
  value: number
  max: number
  thick?: boolean
}) {
  return (
    <div
      className={`mt-1.5 overflow-hidden rounded-full bg-muted ${thick ? "h-2" : "h-1.5"}`}
    >
      <div
        className="h-full rounded-full bg-secondary"
        style={{
          width: `${Math.max(0, Math.min(100, (value / (max || 1)) * 100))}%`,
        }}
      />
    </div>
  )
}
export function AnalyticsCards({
  operations,
  sales,
  loading,
  tab,
}: {
  operations?: OperationsSummary
  sales?: SalesToday
  loading: boolean
  tab: "all" | "revenue" | "orders" | "staff"
}) {
  if (loading && (!operations || !sales))
    return <LoadingState label="analytics" />
  if (!operations || !sales) return null
  const revenue = tab === "all" || tab === "revenue"
  const orders = tab === "all" || tab === "orders"
  const staff = tab === "all" || tab === "staff"
  const best = [...operations.topItems].sort(
    (a, b) => b.orderCount - a.orderCount || b.revenue - a.revenue
  )
  const people = [...operations.staff].sort(
    (a, b) => b.orderCount - a.orderCount
  )
  const maxOrders = Math.max(1, ...best.map((row) => row.orderCount))
  const maxStaff = Math.max(1, ...people.map((row) => row.orderCount))
  const heatmap = heatmapCounts(operations.peakHours)
  const peak = Math.max(1, ...heatmap.flat())
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const hours = ["9 AM", "12 PM", "3 PM", "6 PM", "9 PM+"]
  const total = operations.categories.reduce((sum, row) => sum + row.revenue, 0)
  const lastClose = operations.shiftsClosed.at(0)
  const customers = operations.customers
  const adjustments = [
    {
      label: "Discounts given",
      amount: sales.discounts,
      note: `${sales.discountCount} orders · excluding tax`,
    },
    { label: "Comps", amount: sales.comps, note: "Excluding tax" },
    {
      label: "Voids",
      amount: sales.voidAmount,
      note: `${sales.voidCount} orders · cancelled in this period`,
    },
    {
      label: "Refunds issued",
      amount: sales.refundsTotal,
      note: "Including refunded tax and tips",
    },
  ]
  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      {revenue && (
        <AnalyticsCard
          title="Sales trend"
          description="Net revenue across day, week, and month ranges; after discounts, comps and sales refunds, excluding tax and tips."
        >
          <Trend trend={operations.trend} />
        </AnalyticsCard>
      )}
      {orders && (
        <AnalyticsCard
          title="Best-selling meals"
          description="Ranked by completed orders in the selected range. Item revenue includes modifiers, before order-level adjustments."
        >
          {best.length ? (
            <ol className="space-y-3">
              {best.map((item, index) => (
                <Rank key={item.name} index={index}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {item.orderCount} orders
                      </p>
                    </div>
                    <Bar value={item.orderCount} max={maxOrders} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {formatMoney(item.revenue)}
                  </span>
                </Rank>
              ))}
            </ol>
          ) : (
            <NoSales />
          )}
        </AnalyticsCard>
      )}
      {orders && (
        <AnalyticsCard
          title="Order time heatmap"
          description="Order volume by weekday and time window in the restaurant’s timezone."
        >
          <div className="overflow-x-auto">
            <div className="grid min-w-[420px] grid-cols-[2.5rem_repeat(5,minmax(0,1fr))] gap-1.5">
              <span />
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="text-center text-[10px] font-medium text-muted-foreground"
                >
                  {hour}
                </span>
              ))}
              {heatmap.map((row, day) => (
                <Fragment key={days[day]}>
                  <span className="self-center text-[10px] font-medium text-muted-foreground">
                    {days[day]}
                  </span>
                  {row.map((count, hour) => (
                    <span
                      key={hour}
                      data-heatmap-cell="true"
                      tabIndex={0}
                      aria-label={`${days[day]} ${hours[hour]}: ${count} orders`}
                      title={`${days[day]} ${hours[hour]}: ${count} orders`}
                      className="h-8 rounded-md bg-secondary"
                      style={{ opacity: 0.12 + (count / peak) * 0.88 }}
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
          <p className="mt-2 text-[11px] text-muted-foreground">
            Three-hour windows from 9 AM; 9 PM+ includes overnight orders
            through 8:59 AM.
          </p>
        </AnalyticsCard>
      )}
      {revenue && (
        <AnalyticsCard
          title="Category performance"
          description="Share of item revenue by menu category, before order-level adjustments."
        >
          {operations.categories.length ? (
            <ul className="space-y-4">
              {operations.categories.map((category) => (
                <li key={category.name}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {total ? Math.round((category.revenue / total) * 100) : 0}
                      %
                    </span>
                  </div>
                  <Bar thick value={category.revenue} max={total} />
                </li>
              ))}
            </ul>
          ) : (
            <NoSales />
          )}
        </AnalyticsCard>
      )}
      {revenue && (
        <AnalyticsCard
          title="Discount & void impact"
          description="Saved discounts, comps, cancellations and refunds for the selected range."
        >
          <dl className="divide-y divide-border/60">
            {adjustments.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <div>
                  <dt className="text-sm font-medium">{row.label}</dt>
                  <dd className="text-xs text-muted-foreground">{row.note}</dd>
                </div>
                <dd className="text-sm font-semibold tabular-nums">
                  {formatMoney(row.amount)}
                </dd>
              </div>
            ))}
          </dl>
        </AnalyticsCard>
      )}
      {revenue && (
        <AnalyticsCard
          title="Reconciliation & variance"
          description="Last close versus expected, plus variance history for the selected range."
        >
          {lastClose ? (
            <>
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Expected", value: lastClose.expectedCash },
                  { label: "Counted", value: lastClose.countedCash },
                  { label: "Variance", value: lastClose.variance },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-md bg-muted/35 px-2 py-3"
                  >
                    <dt className="text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 truncate text-sm font-semibold tabular-nums">
                      {stat.value == null
                        ? "Not counted"
                        : formatMoney(stat.value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                {lastClose.variance == null
                  ? "Not reconciled."
                  : lastClose.varianceFlagged
                    ? "Flagged for review."
                    : "Within tolerance."}{" "}
                Variance history:
              </p>
              <div className="mt-2">
                <LineChart
                  height={90}
                  label="Cash variance history"
                  points={[...operations.shiftsClosed]
                    .reverse()
                    .filter((shift) => shift.variance != null)
                    .map((shift) => ({
                      label: new Date(shift.closedAt).toLocaleDateString(),
                      value: shift.variance ?? 0,
                    }))}
                />
              </div>
            </>
          ) : (
            <EmptyState
              title="No closed shifts"
              description="Close a shift to see its reconciliation for these dates."
            />
          )}
        </AnalyticsCard>
      )}
      {staff && (
        <AnalyticsCard
          title="Staff performance"
          description="Completed orders handled and discount frequency per person."
        >
          {people.length ? (
            <ol className="space-y-3">
              {people.map((person, index) => (
                <Rank key={person.id} index={index}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {person.name}
                      </p>
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {person.orderCount} orders · {person.discountCount}{" "}
                        discounts
                      </p>
                    </div>
                    <Bar value={person.orderCount} max={maxStaff} />
                  </div>
                </Rank>
              ))}
            </ol>
          ) : (
            <NoSales />
          )}
        </AnalyticsCard>
      )}
      {orders && (
        <AnalyticsCard
          title="Customer repeat rate"
          description="Share of identified customers with an earlier or repeat completed purchase."
        >
          <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
            {customers.identifiedOrders ? `${customers.repeatRate}%` : "—"}
          </p>
          <div
            role="progressbar"
            aria-label="Customer repeat rate"
            aria-valuenow={customers.repeatRate}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-secondary"
              style={{ width: `${customers.repeatRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {customers.identifiedOrders
              ? `${customers.uniqueCustomers} identified customers · ${customers.repeatCustomers} returning`
              : "No identified customer purchases in this period."}
          </p>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Coverage: {customers.identifiedOrders} of {customers.totalOrders}{" "}
            completed sales. Cash, transfers and older unidentified payments are
            excluded.
          </p>
        </AnalyticsCard>
      )}
      {revenue && (
        <AnalyticsCard
          title="Tax & service charges"
          description="Saved order-level amounts, after refunds; historical tax snapshots are preserved."
        >
          <dl className="space-y-2 text-sm">
            {[
              { name: "Net revenue", amount: sales.netRevenue },
              ...sales.taxBreakdown,
              { name: "Total tax collected", amount: sales.taxCollected },
              { name: "Tips", amount: sales.tips },
            ].map((row) => (
              <div key={row.name} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{row.name}</dt>
                <dd className="font-semibold tabular-nums">
                  {formatMoney(row.amount)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-border/60 pt-2">
              <dt className="font-medium">Total collected</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(sales.totalCollected)}
              </dd>
            </div>
          </dl>
        </AnalyticsCard>
      )}
    </div>
  )
}
