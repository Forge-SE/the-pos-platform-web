import { MobileFeatureFilters } from "@/components/mobile/mobile-feature-filters"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { format, isValid, parseISO } from "date-fns"
import {
  CoinsIcon,
  CreditCardIcon,
  ReceiptIcon,
  WalletIcon,
} from "@phosphor-icons/react"

import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "@/components/date-range-picker"
import { DataTable } from "@/components/ui/data-table"
import { MetricCard } from "@/components/ui/metric-card"
import { EmptyState, ErrorState } from "@/components/content-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShareBars, ShareDonut, TrendChart } from "@/features/ops/ops-charts"
import { OpsHeader } from "@/features/ops/ops-shell"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { formatMoney } from "@/features/menu/model"
import { opsAuthContext } from "@/lib/ops-token"
import { useUrlState } from "@/lib/url-state"
import { useTablePagination } from "@/lib/table-state"

const METRICS_QUERY = gql`
  query PlatformOrderMetrics(
    $from: String
    $to: String
    $region: String
    $category: String
    $status: String
    $diningType: String
  ) {
    platformMetricOptions {
      regions
      categories
    }
    platformOrderMetrics(
      from: $from
      to: $to
      region: $region
      category: $category
      status: $status
      diningType: $diningType
    ) {
      orderCount
      revenue
      subscriptionPaymentCount
      subscriptionRevenue
      byDay {
        day
        orderCount
        revenue
        subscriptionCount
        subscriptionRevenue
      }
      subscriptionByPlan {
        label
        paymentCount
        revenue
      }
      subscriptionByRegion {
        label
        paymentCount
        revenue
      }
      byRegion {
        region
        orderCount
        revenue
      }
      byCategory {
        category
        orderCount
        revenue
      }
    }
  }
`

const statuses = ["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"]

export function OpsMetrics() {
  const [from, setFrom] = useUrlState("metricsFrom")
  const [to, setTo] = useUrlState("metricsTo")
  const [region, setRegion] = useUrlState("metricsRegion")
  const [category, setCategory] = useUrlState("metricsCategory")
  const [status, setStatus] = useUrlState("metricsStatus")
  const [diningType, setDiningType] = useUrlState("metricsOrderType")
  const parsedFrom = from ? parseISO(from) : null
  const parsedTo = to ? parseISO(to) : null
  const range: DateRange | undefined =
    parsedFrom && isValid(parsedFrom)
      ? {
          from: parsedFrom,
          to: parsedTo && isValid(parsedTo) ? parsedTo : parsedFrom,
        }
      : undefined
  function changeRange(next: DateRange | undefined) {
    setFrom(next?.from ? format(next.from, "yyyy-MM-dd") : null)
    setTo(next?.from ? format(next.to ?? next.from, "yyyy-MM-dd") : null)
  }
  const { data, loading, error, refetch } = useQuery<{
    platformMetricOptions: { regions: string[]; categories: string[] }
    platformOrderMetrics: {
      orderCount: number
      revenue: number
      subscriptionPaymentCount: number
      subscriptionRevenue: number
      byDay: Array<{
        day: string
        orderCount: number
        revenue: number
        subscriptionCount: number
        subscriptionRevenue: number
      }>
      byRegion: Array<{ region: string; orderCount: number; revenue: number }>
      byCategory: Array<{
        category: string
        orderCount: number
        revenue: number
      }>
      subscriptionByPlan: Array<{
        label: string
        paymentCount: number
        revenue: number
      }>
      subscriptionByRegion: Array<{
        label: string
        paymentCount: number
        revenue: number
      }>
    }
  }>(METRICS_QUERY, {
    variables: {
      from,
      to,
      region,
      category,
      status,
      diningType,
    },
    context: opsAuthContext(),
  })
  useOpsAuthError(error)
  const metrics = data?.platformOrderMetrics
  const options = data?.platformMetricOptions

  return (
    <>
      <OpsHeader
        title="Metrics"
        description="Orders, order revenue, and Paystack subscription payments. Date and region apply to both. Category, status, and order type apply to orders."
      />
      <section className="content-region mx-4 mb-8 space-y-4 lg:mx-8">
        <MobileFeatureFilters label="Metrics">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/70 bg-card p-4 xl:flex-nowrap">
            <div className="min-w-0 shrink-0 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Date range
              </p>
              <DateRangePicker value={range} onChange={changeRange} />
            </div>
            <Choice
              label="Region"
              value={region ?? ""}
              onChange={setRegion}
              options={options?.regions ?? []}
              placeholder="All regions"
            />
            <Choice
              label="Category"
              value={category ?? ""}
              onChange={setCategory}
              options={options?.categories ?? []}
              placeholder="All categories"
            />
            <Choice
              label="Status"
              value={status ?? ""}
              onChange={setStatus}
              options={statuses}
              placeholder="All statuses"
            />
            <Choice
              label="Order type"
              value={diningType ?? ""}
              onChange={setDiningType}
              options={["DINE_IN", "TAKEAWAY", "DELIVERY"]}
              labels={{
                DINE_IN: "Dine-In",
                TAKEAWAY: "Pickup",
                DELIVERY: "Delivery",
              }}
              placeholder="All types"
            />
          </div>
        </MobileFeatureFilters>

        {error ? (
          <ErrorState title="Couldn’t load metrics." onRetry={refetch} />
        ) : (
          <>
            <div className="mobile-metric-collection grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={ReceiptIcon}
                label="Orders"
                value={loading ? "—" : String(metrics?.orderCount ?? 0)}
              />
              <MetricCard
                icon={WalletIcon}
                label="Order revenue"
                value={loading ? "—" : formatMoney(metrics?.revenue ?? 0)}
              />
              <MetricCard
                icon={CreditCardIcon}
                label="Subscription payments"
                value={
                  loading ? "—" : String(metrics?.subscriptionPaymentCount ?? 0)
                }
              />
              <MetricCard
                icon={CoinsIcon}
                label="Subscription revenue"
                value={
                  loading ? "—" : formatMoney(metrics?.subscriptionRevenue ?? 0)
                }
              />
            </div>

            <TrendChart points={metrics?.byDay ?? []} />

            <div className="grid gap-4 lg:grid-cols-2">
              <ShareBars
                title="Revenue by region"
                valueLabel="revenue"
                rows={(metrics?.byRegion ?? []).map((row) => ({
                  label: row.region,
                  orderCount: row.orderCount,
                  revenue: row.revenue,
                }))}
              />
              <ShareDonut
                title="Sales by category"
                rows={(metrics?.byCategory ?? []).slice(0, 6).map((row) => ({
                  label: row.category,
                  orderCount: row.orderCount,
                  revenue: row.revenue,
                }))}
              />
              <ShareBars
                title="Subscription revenue by plan"
                valueLabel="subscription revenue"
                countLabel="payments"
                rows={(metrics?.subscriptionByPlan ?? []).map((row) => ({
                  label: row.label,
                  orderCount: row.paymentCount,
                  revenue: row.revenue,
                }))}
              />
              <ShareDonut
                title="Subscription revenue by region"
                rows={(metrics?.subscriptionByRegion ?? []).map((row) => ({
                  label: row.label,
                  orderCount: row.paymentCount,
                  revenue: row.revenue,
                }))}
              />
            </div>

            <Breakdown
              title="By region"
              rows={(metrics?.byRegion ?? []).map((row) => ({
                label: row.region,
                orderCount: row.orderCount,
                revenue: row.revenue,
              }))}
            />
            <Breakdown
              title="By category"
              rows={(metrics?.byCategory ?? []).map((row) => ({
                label: row.category,
                orderCount: row.orderCount,
                revenue: row.revenue,
              }))}
              revenueLabel="Item sales"
            />
            <Breakdown
              title="Subscription payments by plan"
              countLabel="Payments"
              rows={(metrics?.subscriptionByPlan ?? []).map((row) => ({
                label: row.label,
                orderCount: row.paymentCount,
                revenue: row.revenue,
              }))}
            />
          </>
        )}
      </section>
    </>
  )
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="min-w-[9rem] flex-1 text-xs font-medium text-muted-foreground sm:max-xl:basis-[calc(50%-0.375rem)]">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function Choice({
  label,
  value,
  onChange,
  options,
  placeholder,
  labels,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  labels?: Record<string, string>
}) {
  return (
    <Filter label={label}>
      <Select
        value={value || "all"}
        onValueChange={(next) => onChange(!next || next === "all" ? "" : next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels?.[option] ?? option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Filter>
  )
}

function Breakdown({
  title,
  rows,
  revenueLabel = "Revenue",
  countLabel = "Orders",
}: {
  title: string
  rows: Array<{ label: string; orderCount: number; revenue: number }>
  revenueLabel?: string
  countLabel?: string
}) {
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "")
  const [search, setSearch] = useUrlState(`${key}Search`)
  const paging = useTablePagination(key)
  const filtered = rows.filter((row) =>
    row.label.toLowerCase().includes((search ?? "").toLowerCase().trim())
  )
  const visible = filtered.slice(
    paging.windowStart(),
    (paging.pageIndex + 1) * paging.pageSize
  )
  return (
    <section className="content-region overflow-hidden rounded-md bg-card">
      <h2 className="border-b border-border/70 px-4 py-3 text-sm font-semibold">
        {title}
      </h2>
      <DataTable
        mobileFeedMode="window"
        ariaLabel={title}
        rows={visible}
        search={{
          value: search ?? "",
          onChange: (value) => {
            setSearch(value || null)
            paging.resetPage()
          },
          placeholder: `Search ${title.toLowerCase()}`,
        }}
        pagination={{ ...paging, totalCount: filtered.length }}
      >
        <thead className="bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">{countLabel}</th>
            <th className="px-4 py-3 font-medium">{revenueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={3}>
                <EmptyState
                  title="Nothing in this range."
                  description="Choose a different date range or adjust the filters."
                />
              </td>
            </tr>
          ) : (
            visible.map((row) => (
              <tr key={row.label} className="border-t border-border/70">
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3">{row.orderCount}</td>
                <td className="px-4 py-3">{formatMoney(row.revenue)}</td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </section>
  )
}
