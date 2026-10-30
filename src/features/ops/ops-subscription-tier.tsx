import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import {
  CalendarCheckIcon,
  CreditCardIcon,
  StorefrontIcon,
  WalletIcon,
} from "@phosphor-icons/react"

import { EmptyState, ErrorState } from "@/components/content-state"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import type { DataTableColumn } from "@/components/ui/data-table"
import { MetricCard } from "@/components/ui/metric-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { ShareBars } from "@/features/ops/ops-charts"
import { AssignSubscription } from "@/features/ops/ops-subscriptions"
import { OpsHeader } from "@/features/ops/ops-shell"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { formatMoney } from "@/features/menu/model"
import { opsAuthContext } from "@/lib/ops-token"
import { useTablePagination } from "@/lib/table-state"
import { useUrlState } from "@/lib/url-state"

export type TierTab = "analytics" | "renewals" | "restaurants"

type Plan = {
  id: string
  name: string
  description: string | null
  amount: number
  interval: string
  active: boolean
}
type Subscription = {
  id: string
  restaurantId: string
  restaurantName: string
  status: string
  billingEmail: string | null
  lastPaidAt: string | null
  nextPaymentAt: string | null
}
type Detail = {
  plan: Plan
  currentRestaurants: Subscription[]
  pendingRenewals: Subscription[]
  paymentCount: number
  revenue: number
  byMonth: Array<{ month: string; paymentCount: number; revenue: number }>
  recentPayments: Array<{
    id: string
    restaurantId: string
    restaurantName: string
    amount: number
    paidAt: string
  }>
}

const TIER_QUERY = gql`
  query PlatformSubscriptionTier($id: ID!) {
    platformSubscriptionTier(id: $id) {
      plan {
        id
        name
        description
        amount
        interval
        active
      }
      currentRestaurants {
        id
        restaurantId
        restaurantName
        status
        billingEmail
        lastPaidAt
        nextPaymentAt
      }
      pendingRenewals {
        id
        restaurantId
        restaurantName
        status
        billingEmail
        lastPaidAt
        nextPaymentAt
      }
      paymentCount
      revenue
      byMonth {
        month
        paymentCount
        revenue
      }
      recentPayments {
        id
        restaurantId
        restaurantName
        amount
        paidAt
      }
    }
  }
`

function date(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-GH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—"
}

export function OpsSubscriptionTier({
  tierId,
  tab,
}: {
  tierId: string
  tab: TierTab
}) {
  const [assigning, setAssigning] = useState(false)
  const { data, loading, error, refetch } = useQuery<{
    platformSubscriptionTier: Detail
  }>(TIER_QUERY, {
    variables: { id: tierId },
    context: opsAuthContext(),
    fetchPolicy: "network-only",
  })
  useOpsAuthError(error)
  const detail = data?.platformSubscriptionTier
  const plan = detail?.plan

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <div className="px-5 pt-5 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/ops/subscriptions" />}
        >
          ← Subscriptions
        </Button>
      </div>
      <OpsHeader
        title={plan?.name ?? "Subscription tier"}
        description={
          plan
            ? `${formatMoney(plan.amount)} / ${plan.interval}${plan.description ? ` · ${plan.description}` : ""}`
            : "Tier analytics and restaurant subscriptions"
        }
      >
        {plan && (
          <Button onClick={() => setAssigning(true)}>Assign restaurant</Button>
        )}
      </OpsHeader>
      <div className="mx-5 mb-8 flex min-w-0 flex-1 flex-col lg:mx-8">
        <nav
          aria-label="Tier sections"
          className="mb-6 flex shrink-0 gap-6 overflow-x-auto border-b border-border/70"
        >
          {(
            [
              { value: "analytics", label: "Analytics" },
              { value: "renewals", label: "Pending renewals" },
              { value: "restaurants", label: "On this plan" },
            ] as const
          ).map((item) => (
            <Link
              key={item.value}
              to="/ops/subscriptions/$tierId"
              params={{ tierId }}
              search={{ tab: item.value }}
              aria-current={tab === item.value ? "page" : undefined}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring ${tab === item.value ? "border-secondary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {item.label}
              {item.value === "renewals" && detail
                ? ` (${detail.pendingRenewals.length})`
                : ""}
            </Link>
          ))}
        </nav>
        {error && (
          <ErrorState
            title="Could not load this tier."
            onRetry={() => void refetch()}
          />
        )}
        {loading && !data && (
          <p role="status" className="py-10 text-sm text-muted-foreground">
            Loading tier…
          </p>
        )}
        {detail && !error && (
          <>
            {tab === "analytics" && <TierAnalytics detail={detail} />}
            {tab === "renewals" && (
              <section className="flex min-h-[26rem] min-w-0 flex-1 flex-col">
                <p className="mb-4 text-sm text-muted-foreground">
                  Paid subscriptions due within 30 days, including overdue
                  renewals.
                </p>
                <TierRestaurantsTable
                  rows={detail.pendingRenewals}
                  id="tierRenewals"
                  empty="No renewals are pending for this tier."
                />
              </section>
            )}
            {tab === "restaurants" && (
              <section className="flex min-h-[26rem] min-w-0 flex-1 flex-col">
                <TierRestaurantsTable
                  rows={detail.currentRestaurants}
                  id="tierRestaurants"
                  empty="No restaurants are currently on this tier."
                />
              </section>
            )}
          </>
        )}
      </div>
      {assigning && plan && (
        <AssignSubscription
          plans={[plan]}
          fixedPlanId={plan.id}
          onClose={() => setAssigning(false)}
          onSaved={async () => {
            setAssigning(false)
            await refetch()
          }}
        />
      )}
    </div>
  )
}

function TierAnalytics({ detail }: { detail: Detail }) {
  const paymentColumns: DataTableColumn<Detail["recentPayments"][number]>[] = [
    {
      id: "restaurant",
      header: "Restaurant",
      cell: (row) => (
        <Link
          to="/ops/restaurants/$restaurantId"
          params={{ restaurantId: row.restaurantId }}
          search={{ tab: "general" }}
          className="font-medium hover:underline"
        >
          {row.restaurantName}
        </Link>
      ),
    },
    { id: "paidAt", header: "Paid", cell: (row) => date(row.paidAt) },
    {
      id: "amount",
      header: "Amount",
      cell: (row) => formatMoney(row.amount),
      className: "text-right",
    },
  ]
  return (
    <div className="space-y-6">
      <div className="mobile-metric-collection grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={StorefrontIcon}
          label="On this plan"
          value={String(detail.currentRestaurants.length)}
        />
        <MetricCard
          icon={CalendarCheckIcon}
          label="Pending renewals"
          value={String(detail.pendingRenewals.length)}
        />
        <MetricCard
          icon={CreditCardIcon}
          label="Recorded payments"
          value={String(detail.paymentCount)}
        />
        <MetricCard
          icon={WalletIcon}
          label="Recorded revenue"
          value={formatMoney(detail.revenue)}
        />
      </div>
      {detail.byMonth.length ? (
        <ShareBars
          title="Payments by month"
          valueLabel="revenue"
          countLabel="payments"
          rows={detail.byMonth.slice(-12).map((row) => ({
            label: row.month,
            orderCount: row.paymentCount,
            revenue: row.revenue,
          }))}
        />
      ) : (
        <section className="rounded-lg border border-border/70 bg-card p-5">
          <h2 className="text-sm font-semibold">Payments by month</h2>
          <EmptyState
            title="No payments recorded for this tier."
            description="Payment trends will appear after Paystack confirms a subscription charge."
          />
        </section>
      )}
      <section className="min-w-0">
        <h2 className="px-4 py-3 text-sm font-semibold">Recent payments</h2>
        <DataTable
          mobileFeedMode="window"
          ariaLabel="Recent tier payments"
          rows={detail.recentPayments}
          columns={paymentColumns}
          getRowId={(row) => row.id}
          emptyState={
            <EmptyState
              title="No payments recorded for this tier."
              description="Payments will appear after Paystack confirms a subscription charge."
            />
          }
        />
      </section>
    </div>
  )
}

function TierRestaurantsTable({
  rows,
  id,
  empty,
}: {
  rows: Subscription[]
  id: string
  empty: string
}) {
  const [search, setSearch] = useUrlState(`${id}Search`)
  const paging = useTablePagination(id, 20, [10, 20, 50])
  const filtered = rows.filter((row) =>
    `${row.restaurantName} ${row.status} ${row.billingEmail ?? ""}`
      .toLowerCase()
      .includes((search ?? "").trim().toLowerCase())
  )
  const pageIndex = Math.min(
    paging.pageIndex,
    Math.max(0, Math.ceil(filtered.length / paging.pageSize) - 1)
  )
  const columns: DataTableColumn<Subscription>[] = [
    {
      id: "restaurant",
      header: "Restaurant",
      cell: (row) => (
        <Link
          to="/ops/restaurants/$restaurantId"
          params={{ restaurantId: row.restaurantId }}
          search={{ tab: "general" }}
          className="font-medium hover:underline"
        >
          {row.restaurantName}
        </Link>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          tone={
            row.status === "ACTIVE"
              ? "success"
              : row.status === "PAST_DUE"
                ? "warning"
                : "neutral"
          }
        >
          {row.status.replaceAll("_", " ").toLowerCase()}
        </StatusBadge>
      ),
    },
    {
      id: "lastPaid",
      header: "Last paid",
      cell: (row) => date(row.lastPaidAt),
    },
    {
      id: "nextDue",
      header: "Next due",
      cell: (row) => date(row.nextPaymentAt),
    },
  ]
  return (
    <DataTable
      mobileFeedMode="window"
      ariaLabel={
        id === "tierRenewals" ? "Pending renewals" : "Restaurants on tier"
      }
      rows={filtered.slice(
        paging.windowStart(pageIndex),
        (pageIndex + 1) * paging.pageSize
      )}
      columns={columns}
      getRowId={(row) => row.id}
      search={{
        value: search ?? "",
        onChange: (value) => {
          setSearch(value || null)
          paging.resetPage()
        },
        placeholder: "Search restaurants",
      }}
      pagination={{ ...paging, pageIndex, totalCount: filtered.length }}
      emptyState={search ? "No restaurants match your search." : empty}
    />
  )
}
