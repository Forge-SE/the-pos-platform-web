import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery, useSubscription } from "@apollo/client/react"
import { Link } from "@tanstack/react-router"
import type { Icon } from "@phosphor-icons/react"
import {
  ArrowClockwiseIcon,
  ForkKnifeIcon,
  MagnifyingGlassIcon,
  ReceiptIcon,
  SpinnerGapIcon,
  UsersThreeIcon,
  WalletIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { PaymentDonut, PaymentDonutSkeleton } from "@/components/payment-donut"
import { ContentState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { diningLabel } from "@/features/orders/labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAccessTokenProfile } from "@/lib/auth-token"
import type { AccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"

const ACTIVE_ORDER_FIELDS = gql`
  fragment OverviewActiveOrder on Order {
    id
    status
    diningType
    total
    createdAt
    items {
      id
      name
      quantity
    }
  }
`

const OPERATIONS_QUERY = gql`
  query OverviewOperations {
    currentShift {
      id
      status
      openingFloat
      openedAt
    }
    activeOrders {
      ...OverviewActiveOrder
    }
  }
  ${ACTIVE_ORDER_FIELDS}
`

const ORDER_CREATED_SUBSCRIPTION = gql`
  subscription OverviewOrderCreated {
    orderCreated {
      ...OverviewActiveOrder
    }
  }
  ${ACTIVE_ORDER_FIELDS}
`

const ORDER_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription OverviewOrderStatusChanged {
    orderStatusChanged {
      ...OverviewActiveOrder
    }
  }
  ${ACTIVE_ORDER_FIELDS}
`

const SALES_QUERY = gql`
  query OverviewSales {
    salesToday {
      totalSales
      orderCount
      paymentBreakdown {
        method
        amount
      }
    }
  }
`

const OPEN_SHIFT = gql`
  mutation OverviewOpenShift($input: OpenShiftInput!) {
    openShift(input: $input) {
      id
      status
      openingFloat
      openedAt
    }
  }
`

interface Shift {
  id: string
  status: string
  openingFloat: number
  openedAt: string
}

interface ActiveOrder {
  id: string
  status: "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
  diningType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  total: number
  createdAt: string
  items: Array<{ id: string; name: string; quantity: number }>
}

interface OperationsData {
  currentShift: Shift | null
  activeOrders: ActiveOrder[]
}

interface OrderCreatedData {
  orderCreated: ActiveOrder
}

interface OrderStatusChangedData {
  orderStatusChanged: ActiveOrder
}

interface SalesData {
  salesToday: {
    totalSales: number
    orderCount: number
    paymentBreakdown: Array<{
      method: "CASH" | "MOMO" | "TRANSFER"
      amount: number
    }>
  }
}

interface OpenShiftData {
  openShift: Shift
}

interface OpenShiftVariables {
  input: {
    idempotencyKey: string
    openingFloat: number
  }
}

const statusStyles: Record<ActiveOrder["status"], string> = {
  NEW: "border-amber-200 bg-amber-50 text-amber-800",
  PREPARING: "border-sky-200 bg-sky-50 text-sky-800",
  READY: "border-primary/30 bg-primary/10 text-secondary",
  COMPLETED: "border-border bg-muted text-muted-foreground",
  CANCELLED: "border-destructive/20 bg-destructive/5 text-destructive",
}

const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
})

function formatMoney(value: number) {
  return currency.format(value / 100)
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function Overview() {
  const [search, setSearch] = useState("")
  const [shiftActionError, setShiftActionError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const profile = getAccessTokenProfile() as AccessTokenProfile
  const canSeeSales = hasPermission(profile, "REPORTS_VIEW")
  const opensShift = profile.role === "CASHIER" || profile.role === "KITCHEN"
  const { data, loading, error, refetch, subscribeToMore } =
    useQuery<OperationsData>(OPERATIONS_QUERY, {
      // Fully websocket-driven via subscribeToMore below; no polling.
      fetchPolicy: "cache-and-network",
    })
  const [openShift, { loading: openingShift }] = useMutation<
    OpenShiftData,
    OpenShiftVariables
  >(OPEN_SHIFT)
  const {
    data: salesData,
    loading: salesLoading,
    error: salesError,
    refetch: refetchSales,
  } = useQuery<SalesData>(SALES_QUERY, {
    skip: !canSeeSales,
    fetchPolicy: "cache-and-network",
    // No polling: refreshed when order subscriptions fire below.
  })

  useEffect(() => {
    const unsubscribeCreated = subscribeToMore<OrderCreatedData>({
      document: ORDER_CREATED_SUBSCRIPTION,
      updateQuery: (
        _unsafePrevious,
        { complete, previousData, subscriptionData }
      ) => {
        if (!complete) return
        const previous = previousData
        const createdOrder = subscriptionData.data.orderCreated

        const existingOrder = previous.activeOrders.some(
          (order) => order.id === createdOrder.id
        )
        return {
          ...previous,
          activeOrders: existingOrder
            ? previous.activeOrders.map((order) =>
                order.id === createdOrder.id ? createdOrder : order
              )
            : [createdOrder, ...previous.activeOrders],
        }
      },
    })

    const unsubscribeStatusChanged = subscribeToMore<OrderStatusChangedData>({
      document: ORDER_STATUS_CHANGED_SUBSCRIPTION,
      updateQuery: (
        _unsafePrevious,
        { complete, previousData, subscriptionData }
      ) => {
        if (!complete) return
        const previous = previousData
        const changedOrder = subscriptionData.data.orderStatusChanged

        const isStillActive =
          changedOrder.status !== "COMPLETED" &&
          changedOrder.status !== "CANCELLED"
        if (!isStillActive) {
          return {
            ...previous,
            activeOrders: previous.activeOrders.filter(
              (order) => order.id !== changedOrder.id
            ),
          }
        }

        const existingOrder = previous.activeOrders.some(
          (order) => order.id === changedOrder.id
        )
        return {
          ...previous,
          activeOrders: existingOrder
            ? previous.activeOrders.map((order) =>
                order.id === changedOrder.id ? changedOrder : order
              )
            : [changedOrder, ...previous.activeOrders],
        }
      },
    })

    return () => {
      unsubscribeCreated()
      unsubscribeStatusChanged()
    }
    // Sales totals have no subscription: refresh them whenever an order
    // event arrives via the cache merge above.
  }, [subscribeToMore])

  useSubscription<OrderCreatedData>(ORDER_CREATED_SUBSCRIPTION, {
    skip: !canSeeSales,
    onData: () => {
      void refetchSales().catch(() => undefined)
    },
  })
  useSubscription<OrderStatusChangedData>(ORDER_STATUS_CHANGED_SUBSCRIPTION, {
    skip: !canSeeSales,
    onData: () => {
      void refetchSales().catch(() => undefined)
    },
  })

  const orders = data?.activeOrders ?? []
  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return orders
    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query))
    )
  }, [orders, search])
  const shift = data?.currentShift
  const orderCounts = useMemo(
    () => ({
      preparing: orders.filter((order) => order.status === "PREPARING").length,
      ready: orders.filter((order) => order.status === "READY").length,
    }),
    [orders]
  )

  async function startShift() {
    try {
      setShiftActionError(null)
      await openShift({
        variables: {
          input: {
            idempotencyKey: window.crypto.randomUUID(),
            openingFloat: 0,
          },
        },
      })
      await refetch()
    } catch {
      setShiftActionError("The shift could not be started. Please try again.")
    }
  }

  async function retryOperations() {
    try {
      setRetrying(true)
      await refetch()
    } catch {
      // The persistent query error keeps the retry state visible.
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="content-page mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            {greeting()}, {profile.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in your restaurant right now.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative hidden lg:block">
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              placeholder="Search orders"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-52 rounded-md border border-input bg-muted/40 pr-3 pl-9 text-sm transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
            />
          </label>
          {!loading && !shift && opensShift ? (
            <Button onClick={startShift} disabled={openingShift}>
              {openingShift ? (
                <SpinnerGapIcon
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  data-icon="inline-start"
                />
              ) : (
                <ReceiptIcon aria-hidden="true" data-icon="inline-start" />
              )}
              {openingShift ? "Starting shift…" : "Start shift"}
            </Button>
          ) : (
            <Button render={<Link to="/orders" />}>
              <ReceiptIcon aria-hidden="true" data-icon="inline-start" />
              View orders
            </Button>
          )}
        </div>
      </header>

      {shiftActionError && (
        <p className="mt-3 text-right text-xs text-destructive" role="alert">
          {shiftActionError}
        </p>
      )}

      {!loading && opensShift && shift && (
        <Link
          to="/shift"
          className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <span>
            <span className="block text-sm font-semibold">Shift is open</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {`Opened ${new Date(shift.openedAt).toLocaleTimeString("en-GH", { hour: "numeric", minute: "2-digit" })} · float ${formatMoney(shift.openingFloat)}`}
            </span>
          </span>
          <span className="text-sm font-medium text-secondary">Manage</span>
        </Link>
      )}

      <section
        aria-label="Today at a glance"
        className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {canSeeSales && (
          <>
            <QuickStat
              icon={WalletIcon}
              label="Today's net revenue"
              value={
                salesLoading
                  ? "—"
                  : formatMoney(salesData?.salesToday.totalSales ?? 0)
              }
              detail="Completed sales, less refunds; excludes tax and tips"
            />
            <QuickStat
              icon={ReceiptIcon}
              label="Today's orders"
              value={
                salesLoading
                  ? "—"
                  : String(salesData?.salesToday.orderCount ?? 0)
              }
              detail="Completed today"
            />
          </>
        )}
        <QuickStat
          icon={ReceiptIcon}
          label="Active orders"
          value={loading ? "—" : String(orders.length)}
          detail="Across the floor"
        />
        <QuickStat
          icon={ForkKnifeIcon}
          label="In preparation"
          value={loading ? "—" : String(orderCounts.preparing)}
          detail="With the kitchen"
        />
        <QuickStat
          icon={UsersThreeIcon}
          label="Ready to serve"
          value={loading ? "—" : String(orderCounts.ready)}
          detail="Needs attention"
        />
      </section>

      {error ? (
        <StatePanel
          role="alert"
          variant="error"
          className="mt-6"
          icon={WarningCircleIcon}
          title="We couldn’t load live operations"
          description="Check your connection, then try loading the latest shift and order activity again."
          action={
            <Button
              variant="outline"
              size="lg"
              onClick={retryOperations}
              disabled={retrying}
            >
              {retrying ? (
                <SpinnerGapIcon
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                  data-icon="inline-start"
                />
              ) : (
                <ArrowClockwiseIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                />
              )}
              {retrying ? "Retrying…" : "Try again"}
            </Button>
          }
        />
      ) : (
        <>
          <div
            className={`mt-6 grid flex-1 gap-6 ${canSeeSales ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]" : ""}`}
          >
            <ActiveOrders
              orders={visibleOrders}
              loading={loading}
              searching={Boolean(search.trim())}
              onClearSearch={() => setSearch("")}
            />
            {canSeeSales && (
              <PaymentMix
                loading={salesLoading}
                sales={salesData?.salesToday}
                error={Boolean(salesError)}
                onRetry={refetchSales}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ActiveOrders({
  orders,
  loading,
  searching,
  onClearSearch,
}: {
  orders: ActiveOrder[]
  loading: boolean
  searching: boolean
  onClearSearch: () => void
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            Active orders
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live progress from counter to kitchen.
          </p>
        </div>
        <Badge variant="outline" className="tabular-nums">
          {orders.length} live
        </Badge>
      </div>
      {loading ? (
        <LoadingState className="mt-5" label="active orders" />
      ) : orders.length === 0 ? (
        <StatePanel
          className="mt-5"
          icon={ReceiptIcon}
          title={searching ? "No matching orders" : "No active orders"}
          description={
            searching
              ? "Try a different order number or item name."
              : "New orders will appear here as soon as service begins."
          }
          action={
            searching ? (
              <Button variant="outline" size="lg" onClick={onClearSearch}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="mt-4 divide-y divide-border/70">
          {orders.slice(0, 5).map((order) => (
            <li
              key={order.id}
              className="group flex items-center gap-4 py-3.5 first:pt-1 last:pb-0"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold tabular-nums">
                #{order.id.slice(-3).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {order.items
                    .map((item) => `${item.quantity}× ${item.name}`)
                    .join(", ") || "Order items"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {diningLabel(order.diningType)} ·{" "}
                  {new Date(order.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatMoney(order.total)}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${statusStyles[order.status]}`}
                >
                  {order.status.toLowerCase()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PaymentMix({
  loading,
  sales,
  error,
  onRetry,
}: {
  loading: boolean
  sales?: SalesData["salesToday"]
  error: boolean
  onRetry: () => unknown
}) {
  return (
    <section className="content-region rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            Sales by payment method
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How today&apos;s settled sales were collected.
          </p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-secondary">
          <WalletIcon
            aria-hidden="true"
            className="size-[18px]"
            weight="fill"
          />
        </span>
      </div>
      {error ? (
        <ErrorState
          className="mt-6"
          title="Could not load payment totals."
          onRetry={onRetry}
        />
      ) : loading ? (
        <div className="mt-6">
          <PaymentDonutSkeleton />
        </div>
      ) : (
        <div className="content-region mt-6">
          <PaymentDonut breakdown={sales?.paymentBreakdown ?? []} />
        </div>
      )}
    </section>
  )
}

function StatePanel({
  icon: Icon,
  title,
  description,
  action,
  variant = "empty",
  className = "",
}: {
  icon: Icon
  title: string
  description: string
  action?: ReactNode
  variant?: "empty" | "error"
  className?: string
  role?: "alert" | "status"
}) {
  return (
    <ContentState
      icon={<Icon />}
      title={title}
      description={description}
      action={action}
      error={variant === "error"}
      className={className}
    />
  )
}

function QuickStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: Icon
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="min-w-0 rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-secondary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <p className="truncate text-[10px] font-medium text-muted-foreground">
          {detail}
        </p>
      </div>
      <p className="mt-4 truncate text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
    </article>
  )
}
