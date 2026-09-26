import { useState  } from "react"
import type {ReactNode} from "react";
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"

import { Input } from "@/components/ui/input"
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
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [region, setRegion] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [diningType, setDiningType] = useState("")
  const { data, loading, error } = useQuery<{
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
      from: from || null,
      to: to || null,
      region: region || null,
      category: category || null,
      status: status || null,
      diningType: diningType || null,
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
      <section className="mx-4 mb-8 space-y-4 lg:mx-8">
        <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Filter label="From">
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Filter>
          <Filter label="To">
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Filter>
          <Choice
            label="Region"
            value={region}
            onChange={setRegion}
            options={options?.regions ?? []}
            placeholder="All regions"
          />
          <Choice
            label="Category"
            value={category}
            onChange={setCategory}
            options={options?.categories ?? []}
            placeholder="All categories"
          />
          <Choice
            label="Status"
            value={status}
            onChange={setStatus}
            options={statuses}
            placeholder="All statuses"
          />
          <Choice
            label="Order type"
            value={diningType}
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

        {error && (
          <p className="text-sm text-destructive" role="alert">
            Couldn’t load metrics.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Orders"
            value={loading ? "—" : String(metrics?.orderCount ?? 0)}
          />
          <Stat
            label="Order revenue"
            value={loading ? "—" : formatMoney(metrics?.revenue ?? 0)}
          />
          <Stat
            label="Subscription payments"
            value={
              loading ? "—" : String(metrics?.subscriptionPaymentCount ?? 0)
            }
          />
          <Stat
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
      </section>
    </>
  )
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
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
  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <h2 className="border-b border-border/70 px-4 py-3 text-sm font-semibold">
        {title}
      </h2>
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">{countLabel}</th>
            <th className="px-4 py-3 font-medium">{revenueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-muted-foreground">
                Nothing in this range.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.label} className="border-t border-border/70">
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3">{row.orderCount}</td>
                <td className="px-4 py-3">{formatMoney(row.revenue)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
