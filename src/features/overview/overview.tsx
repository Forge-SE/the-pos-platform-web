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
import {
  diningLabel,
  orderStatusTone,
  statusLabels,
} from "@/features/orders/labels"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/ui/metric-card"
import { getAccessTokenProfile } from "@/lib/auth-token"
import type { AccessTokenProfile } from "@/lib/auth-token"
import { SalesDigestCard } from "@/features/insights/sales-digest"
import { useLanguage } from "@/components/language-provider"
import { hasPermission } from "@/lib/permissions"

const ACTIVE_ORDER_FIELDS = gql`
  fragment OverviewActiveOrder on Order {
    id
    ticketNumber
    status
    diningType
    notes
    tip
    total
    createdAt
    payment {
      method
    }
    items {
      id
      name
      quantity
      notes
      modifiers {
        id
        name
      }
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
  ticketNumber: string
  status: "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
  diningType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  notes: string | null
  tip: number
  total: number
  createdAt: string
  payment: { method: "CASH" | "MOMO" | "TRANSFER" } | null
  items: Array<{
    id: string
    name: string
    quantity: number
    notes: string | null
    modifiers: Array<{ id: string; name: string }>
  }>
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

const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
})

function formatMoney(value: number) {
  return currency.format(value / 100)
}

const paymentLabels: Record<
  NonNullable<ActiveOrder["payment"]>["method"],
  string
> = {
  CASH: "Cash",
  MOMO: "Mobile money",
  TRANSFER: "Transfer",
}

function elapsedLabel(createdAt: string, language: "en" | "fr") {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  )
  if (minutes < 1) return language === "fr" ? "À l’instant" : "Just now"
  if (language === "fr") return `Il y a ${minutes} min`
  if (minutes === 1) return "1 min ago"
  return `${minutes} min ago`
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function Overview() {
  const { t, locale, language } = useLanguage()
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
        order.ticketNumber.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query) ||
        order.items.some(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.notes?.toLowerCase().includes(query) ||
            item.modifiers.some((modifier) =>
              modifier.name.toLowerCase().includes(query)
            )
        )
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
      setShiftActionError(
        t("The shift could not be started. Please try again.")
      )
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
            {new Intl.DateTimeFormat(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            {t(greeting())}, {profile.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("Here's what's happening in your restaurant right now.")}
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
              placeholder={t("Search orders")}
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
              {t(openingShift ? "Starting shift…" : "Start shift")}
            </Button>
          ) : (
            <Button nativeButton={false} render={<Link to="/orders" />}>
              <ReceiptIcon aria-hidden="true" data-icon="inline-start" />
              {t("View orders")}
            </Button>
          )}
        </div>
      </header>
      <SalesDigestCard />

      {shiftActionError && (
        <p className="mt-3 text-right text-xs text-destructive" role="alert">
          {shiftActionError}
        </p>
      )}

      {!loading && opensShift && shift && (
        <Link
          to="/shift"
          className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-card px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <span>
            <span className="block text-sm font-semibold">
              {t("Shift is open")}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {language === "fr"
                ? `Ouvert à ${new Date(shift.openedAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })} · fonds ${formatMoney(shift.openingFloat)}`
                : `Opened ${new Date(shift.openedAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })} · float ${formatMoney(shift.openingFloat)}`}
            </span>
          </span>
          <span className="text-sm font-medium text-secondary">
            {t("Manage")}
          </span>
        </Link>
      )}

      <section
        aria-label={t("Today at a glance")}
        className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {canSeeSales && (
          <>
            <MetricCard
              icon={WalletIcon}
              label={t("Today's net revenue")}
              value={
                salesLoading
                  ? "—"
                  : formatMoney(salesData?.salesToday.totalSales ?? 0)
              }
            />
            <MetricCard
              icon={ReceiptIcon}
              label={t("Today's orders")}
              value={
                salesLoading
                  ? "—"
                  : String(salesData?.salesToday.orderCount ?? 0)
              }
            />
          </>
        )}
        <MetricCard
          icon={ReceiptIcon}
          label={t("Active orders")}
          value={loading ? "—" : String(orders.length)}
        />
        {!canSeeSales && (
          <>
            <MetricCard
              icon={ForkKnifeIcon}
              label={t("In preparation")}
              value={loading ? "—" : String(orderCounts.preparing)}
            />
            <MetricCard
              icon={UsersThreeIcon}
              label={t("Ready to serve")}
              value={loading ? "—" : String(orderCounts.ready)}
            />
          </>
        )}
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
              {t(retrying ? "Retrying…" : "Try again")}
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
  const { t, language, locale } = useLanguage()
  return (
    <section className="flex flex-col rounded-lg border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            {t("Active orders")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Live progress from counter to kitchen.")}
          </p>
        </div>
        <Badge variant="outline" className="tabular-nums">
          {orders.length} {t("live")}
        </Badge>
      </div>
      {loading ? (
        <LoadingState className="mt-5" label="active orders" />
      ) : orders.length === 0 ? (
        <StatePanel
          className="mt-5"
          icon={ReceiptIcon}
          title={t(searching ? "No matching orders" : "No active orders")}
          description={
            searching
              ? t("Try a different order number or item name.")
              : t("New orders will appear here as soon as service begins.")
          }
          action={
            searching ? (
              <Button variant="outline" size="lg" onClick={onClearSearch}>
                {t("Clear search")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-4 max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-card text-xs tracking-[0.06em] text-muted-foreground uppercase">
              <tr className="border-b border-border/70">
                <th className="py-2 pr-3 font-medium">{t("Ticket")}</th>
                <th className="py-2 pr-3 font-medium">{t("Opened")}</th>
                <th className="py-2 pr-3 font-medium">{t("Dining")}</th>
                <th className="py-2 pr-3 font-medium">{t("Items")}</th>
                <th className="py-2 pr-3 font-medium">{t("Status")}</th>
                <th className="py-2 pr-3 font-medium">{t("Payment")}</th>
                <th className="py-2 text-right font-medium">{t("Total")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-border/50 align-top"
                >
                  <td className="py-3 pr-3 font-semibold tabular-nums">
                    #{order.ticketNumber}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span className="block">
                      {new Date(order.createdAt).toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {elapsedLabel(order.createdAt, language)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {t(diningLabel(order.diningType))}
                  </td>
                  <td className="py-3 pr-3">
                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          <p className="font-medium">
                            <span className="tabular-nums">
                              {item.quantity}×
                            </span>{" "}
                            {item.name}
                          </p>
                          {item.modifiers.length > 0 && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.modifiers
                                .map((modifier) => modifier.name)
                                .join(" · ")}
                            </p>
                          )}
                          {item.notes && (
                            <p className="mt-0.5 text-xs text-destructive">
                              {item.notes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                    {order.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("Note")}: {order.notes}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge tone={orderStatusTone(order.status)}>
                      {t(statusLabels[order.status] ?? order.status)}
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {order.payment
                      ? t(paymentLabels[order.payment.method])
                      : t("Unpaid")}
                    {order.tip > 0 && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {t("Tip")} {formatMoney(order.tip)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                    {formatMoney(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const { t } = useLanguage()
  return (
    <section className="content-region rounded-lg border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            {t("Sales by payment method")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("How today's settled sales were collected.")}
          </p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-secondary">
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
