import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react"
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  BellRingingIcon,
  CheckCircleIcon,
  ClockIcon,
  CookingPotIcon,
  ForkKnifeIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon,
  SquaresFourIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { diningLabel } from "@/features/orders/labels"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"
import { useUrlState } from "@/lib/url-state"

type ActiveStatus = "NEW" | "PREPARING" | "READY"
type OrderStatus = ActiveStatus | "COMPLETED" | "CANCELLED"
type ViewMode = "board" | "table"

interface OrderModifier {
  id: string
  name: string
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  notes: string | null
  imageUrl?: string | null
  modifiers: OrderModifier[]
}

interface KitchenOrder {
  id: string
  status: OrderStatus
  diningType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  notes: string | null
  version: number
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

interface ActiveOrdersData {
  activeOrders: KitchenOrder[]
}

interface OrderCreatedData {
  orderCreated: KitchenOrder
}

interface OrderStatusChangedData {
  orderStatusChanged: KitchenOrder
}

interface UpdateStatusData {
  updateOrderStatus: KitchenOrder
}

interface UpdateStatusVariables {
  orderId: string
  status: OrderStatus
}

const ORDER_FIELDS = gql`
  fragment KitchenOrderFields on Order {
    id
    status
    diningType
    notes
    version
    createdAt
    updatedAt
    items {
      id
      name
      quantity
      notes
      imageUrl
      modifiers {
        id
        name
      }
    }
  }
`

const ACTIVE_ORDERS_QUERY = gql`
  query KitchenActiveOrders {
    activeOrders {
      ...KitchenOrderFields
    }
  }
  ${ORDER_FIELDS}
`

const ORDER_CREATED_SUBSCRIPTION = gql`
  subscription KitchenOrderCreated {
    orderCreated {
      ...KitchenOrderFields
    }
  }
  ${ORDER_FIELDS}
`

const ORDER_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription KitchenOrderStatusChanged {
    orderStatusChanged {
      ...KitchenOrderFields
    }
  }
  ${ORDER_FIELDS}
`

const UPDATE_ORDER_STATUS = gql`
  mutation KitchenUpdateOrderStatus($orderId: ID!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      ...KitchenOrderFields
    }
  }
  ${ORDER_FIELDS}
`

const columns: Array<{
  status: ActiveStatus
  step: string
  title: string
  empty: string
  dot: string
  rail: string
}> = [
  {
    status: "NEW",
    step: "1",
    title: "NEW",
    empty: "New tickets will land here automatically.",
    dot: "bg-sky-600",
    rail: "bg-sky-500",
  },
  {
    status: "PREPARING",
    step: "2",
    title: "PREPARING",
    empty: "Orders being cooked will appear here.",
    dot: "bg-amber-600",
    rail: "bg-amber-500",
  },
  {
    status: "READY",
    step: "3",
    title: "READY",
    empty: "Finished orders waiting for handoff appear here.",
    dot: "bg-emerald-600",
    rail: "bg-emerald-500",
  },
]

const nextStatus: Record<ActiveStatus, OrderStatus> = {
  NEW: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
}

const actionLabel: Record<ActiveStatus, string> = {
  NEW: "Start cooking",
  PREPARING: "Mark ready",
  READY: "Complete order",
}

const actionIcon: Record<ActiveStatus, typeof CookingPotIcon> = {
  NEW: CookingPotIcon,
  PREPARING: BellRingingIcon,
  READY: CheckCircleIcon,
}

function isActive(status: OrderStatus): status is ActiveStatus {
  return status === "NEW" || status === "PREPARING" || status === "READY"
}

function ticketNumber(id: string) {
  return `OB-${id.replaceAll("-", "").slice(-4).toUpperCase()}`
}

function elapsedMinutes(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000))
}

function elapsedLabel(createdAt: string, now: number) {
  const minutes = elapsedMinutes(createdAt, now)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

function errorCode(error: unknown) {
  const candidates = error as {
    graphQLErrors?: Array<{ extensions?: { code?: string } }>
    errors?: Array<{ extensions?: { code?: string } }>
  }
  return (
    candidates.graphQLErrors?.[0]?.extensions?.code ??
    candidates.errors?.[0]?.extensions?.code
  )
}

function mergeActiveOrder(orders: KitchenOrder[], changed: KitchenOrder) {
  if (!isActive(changed.status)) {
    return orders.filter((order) => order.id !== changed.id)
  }
  const exists = orders.some((order) => order.id === changed.id)
  return exists
    ? orders.map((order) => (order.id === changed.id ? changed : order))
    : [...orders, changed]
}

// Wrap a cache/state update in the View Transitions API when available so
// the touched ticket glides to its new position instead of jumping.
function transitionUpdate(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => void
  }
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(update)
  } else {
    update()
  }
}

function MealImage({
  name,
  imageUrl,
  size,
}: {
  name: string
  imageUrl?: string | null
  size: "md" | "sm"
}) {
  const cls = size === "md" ? "size-14 rounded-lg" : "size-8 rounded-md"
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className={`${cls} shrink-0 object-cover outline outline-black/10`}
      />
    )
  }
  // Always render a visual: deterministic fallback from the dish name.
  const initial = (name.trim().charAt(0) || "?").toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={`${cls} flex shrink-0 items-center justify-center bg-primary/20 text-sm font-bold text-secondary outline outline-black/5`}
    >
      {initial}
    </span>
  )
}

export function KitchenDisplay({
  readOnly = false,
  switcher,
}: {
  readOnly?: boolean
  switcher?: ReactNode
} = {}) {
  const [view, setView] = useState<ViewMode>("board")
  const [search, setSearch] = useState("")
  const [fullscreenParam, setFullscreenParam] = useUrlState("fullscreen")
  const fullscreen = fullscreenParam === "1"
  const ownsFullscreen = useRef(false)
  const [now, setNow] = useState(() => Date.now())
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Most recently touched ticket: slides to the top with a flash highlight.
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<number | null>(null)

  function touchOrder(id: string) {
    transitionUpdate(() => setHighlightId(id))
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 2400)
  }
  const profile = getAccessTokenProfile()
  const canAdvance =
    !readOnly &&
    (profile?.role === "KITCHEN" || profile?.role === "MANAGER") &&
    hasPermission(profile, "ORDERS_ADVANCE")

  const client = useApolloClient()
  const { data, loading, error, refetch, subscribeToMore } =
    useQuery<ActiveOrdersData>(ACTIVE_ORDERS_QUERY, {
      // Fully websocket-driven via subscribeToMore below; no polling.
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    })
  const [updateStatus] = useMutation<UpdateStatusData, UpdateStatusVariables>(
    UPDATE_ORDER_STATUS
  )

  // Local clock for "Xm ago" labels only — not server polling.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const syncFullscreen = () => {
      if (!document.fullscreenElement && ownsFullscreen.current) {
        ownsFullscreen.current = false
        setFullscreenParam(null)
      }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement)
        setFullscreenParam(null)
    }
    document.addEventListener("fullscreenchange", syncFullscreen)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen)
      document.removeEventListener("keydown", escape)
    }
  }, [setFullscreenParam])

  useEffect(
    () => () => {
      if (ownsFullscreen.current && document.fullscreenElement)
        void document.exitFullscreen().catch(() => undefined)
    },
    []
  )

  async function toggleFullscreen() {
    if (fullscreen) {
      setFullscreenParam(null)
      if (document.fullscreenElement && ownsFullscreen.current)
        await document.exitFullscreen().catch(() => undefined)
      ownsFullscreen.current = false
    } else {
      setFullscreenParam("1")
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen()
          ownsFullscreen.current = true
        } catch {
          // Keep the expanded workspace when browser fullscreen is unavailable.
        }
      }
    }
  }

  useEffect(() => {
    const unsubscribeCreated = subscribeToMore<OrderCreatedData>({
      document: ORDER_CREATED_SUBSCRIPTION,
      updateQuery: (
        _unsafePrevious,
        { complete, previousData, subscriptionData }
      ) => {
        if (!complete) return
        const created = subscriptionData.data.orderCreated
        touchOrder(created.id)
        return {
          ...previousData,
          activeOrders: mergeActiveOrder(previousData.activeOrders, created),
        }
      },
    })
    const unsubscribeChanged = subscribeToMore<OrderStatusChangedData>({
      document: ORDER_STATUS_CHANGED_SUBSCRIPTION,
      updateQuery: (
        _unsafePrevious,
        { complete, previousData, subscriptionData }
      ) => {
        if (!complete) return
        const changed = subscriptionData.data.orderStatusChanged
        touchOrder(changed.id)
        return {
          ...previousData,
          activeOrders: mergeActiveOrder(previousData.activeOrders, changed),
        }
      },
    })
    return () => {
      unsubscribeCreated()
      unsubscribeChanged()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToMore])

  const orders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (
      (data?.activeOrders ?? [])
        .filter(isActiveOrder)
        .filter(
          (order) =>
            !query ||
            ticketNumber(order.id).toLowerCase().includes(query) ||
            order.items.some((item) =>
              item.name.toLowerCase().includes(query)
            ) ||
            order.notes?.toLowerCase().includes(query)
        )
        // Most recently updated slides to the top; oldest first as tiebreak.
        .sort(
          (first, second) =>
            new Date(second.updatedAt).getTime() -
              new Date(first.updatedAt).getTime() ||
            new Date(first.createdAt).getTime() -
              new Date(second.createdAt).getTime()
        )
    )
  }, [data?.activeOrders, search])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        columns.map((column) => [
          column.status,
          orders.filter((order) => order.status === column.status).length,
        ])
      ) as Record<ActiveStatus, number>,
    [orders]
  )

  async function advance(order: KitchenOrder) {
    if (!isActive(order.status) || !canAdvance) return
    const next = nextStatus[order.status]
    const previous = order
    try {
      setNotice(null)
      setPendingOrderId(order.id)
      touchOrder(order.id)
      // Optimistic UI: move the ticket immediately; the subscription or
      // refetch reconciles afterwards. No success refetch needed.
      transitionUpdate(() => {
        client.cache.updateQuery<ActiveOrdersData>(
          { query: ACTIVE_ORDERS_QUERY },
          (prev) => {
            if (!prev) return prev
            return {
              activeOrders: mergeActiveOrder(prev.activeOrders, {
                ...order,
                status: next,
                version: order.version + 1,
                updatedAt: new Date().toISOString(),
              }),
            }
          }
        )
      })
      await updateStatus({
        variables: { orderId: order.id, status: next },
        optimisticResponse: {
          updateOrderStatus: {
            ...order,
            status: next,
            version: order.version + 1,
            updatedAt: new Date().toISOString(),
          },
        },
      })
    } catch (mutationError) {
      // Roll back to the server truth on failure.
      client.cache.updateQuery<ActiveOrdersData>(
        { query: ACTIVE_ORDERS_QUERY },
        (prev) => {
          if (!prev) return prev
          return {
            activeOrders: mergeActiveOrder(prev.activeOrders, previous),
          }
        }
      )
      await refetch()
      setNotice(
        errorCode(mutationError) === "CONFLICT"
          ? "That ticket changed on another device. The board has been refreshed with its current status."
          : "The ticket could not be updated. Check the connection and try again."
      )
    } finally {
      setPendingOrderId(null)
    }
  }

  return (
    <div
      className={`mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8 ${readOnly ? "max-h-[calc(100svh-4.5rem)] overflow-y-auto lg:max-h-[calc(100svh-1rem)]" : ""}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase dark:text-emerald-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            {readOnly ? "Live orders" : "Live kitchen"}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            {readOnly ? "Order status" : "Kitchen display"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {readOnly
              ? "See each ticket move from new, to preparing, to ready."
              : "Track incoming orders in real time and move every ticket through a clear, one-way cooking flow."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {switcher}
          <Button
            variant="outline"
            size="icon"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={fullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
            aria-pressed={fullscreen}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? (
              <ArrowsInIcon aria-hidden="true" />
            ) : (
              <ArrowsOutIcon aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 sm:w-64">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket or dish"
            className="h-10 w-full rounded-lg border border-input bg-muted/30 pr-3 pl-9 text-sm shadow-xs transition-[background-color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/20"
          />
        </label>
        <div
          className="grid grid-cols-2 rounded-lg border border-border/70 bg-muted/50 p-1 sm:ml-auto"
          aria-label="Order view"
        >
          <ViewButton
            active={view === "board"}
            onClick={() => setView("board")}
            icon={<SquaresFourIcon aria-hidden="true" />}
          >
            Board
          </ViewButton>
          <ViewButton
            active={view === "table"}
            onClick={() => setView("table")}
            icon={<ListBulletsIcon aria-hidden="true" />}
          >
            Table
          </ViewButton>
        </div>
      </div>

      {!readOnly && !canAdvance && !loading && !error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          <WarningCircleIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            This role has a read-only view. Kitchen staff, managers, and owners
            can advance tickets.
          </p>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
        >
          <span className="flex items-start gap-3">
            <WarningCircleIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 font-semibold underline underline-offset-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {error ? (
        <StatePanel
          icon={<WarningCircleIcon aria-hidden="true" />}
          title="The kitchen board is offline"
          description="We couldn't load the latest tickets. Retry to reconcile anything missed while the connection was down."
          action={
            <Button variant="outline" onClick={() => refetch()}>
              <ArrowClockwiseIcon aria-hidden="true" data-icon="inline-start" />
              Try again
            </Button>
          }
        />
      ) : view === "board" ? (
        <BoardView
          orders={orders}
          counts={counts}
          loading={loading}
          searching={Boolean(search.trim())}
          now={now}
          canAdvance={canAdvance}
          readOnly={readOnly}
          pendingOrderId={pendingOrderId}
          highlightId={highlightId}
          onAdvance={advance}
        />
      ) : (
        <TableView
          orders={orders}
          loading={loading}
          now={now}
          canAdvance={canAdvance}
          readOnly={readOnly}
          pendingOrderId={pendingOrderId}
          highlightId={highlightId}
          onAdvance={advance}
        />
      )}
    </div>
  )
}

function isActiveOrder(order: KitchenOrder): order is KitchenOrder & {
  status: ActiveStatus
} {
  return isActive(order.status)
}

function ViewButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-[background-color,color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/40 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
    >
      <span className="[&>svg]:size-3.5">{icon}</span>
      {children}
    </button>
  )
}

function BoardView({
  orders,
  counts,
  loading,
  searching,
  now,
  canAdvance,
  readOnly,
  pendingOrderId,
  highlightId,
  onAdvance,
}: {
  orders: Array<KitchenOrder & { status: ActiveStatus }>
  counts: Record<ActiveStatus, number>
  loading: boolean
  searching: boolean
  now: number
  canAdvance: boolean
  readOnly: boolean
  pendingOrderId: string | null
  highlightId: string | null
  onAdvance: (order: KitchenOrder) => void
}) {
  return (
    <section
      aria-label="Kitchen order board"
      className="mt-6 grid gap-4 xl:grid-cols-3"
    >
      {columns.map((column) => {
        const columnOrders = orders.filter(
          (order) => order.status === column.status
        )
        return (
          <section
            key={column.status}
            aria-labelledby={`column-${column.status}`}
            className="relative min-w-0 rounded-2xl border border-border/70 bg-muted/20 pt-1"
          >
            <div
              aria-hidden="true"
              className={`absolute -top-[3px] right-6 left-6 h-1.5 rounded-full ${column.rail}`}
            />
            <header className="flex items-center justify-between gap-3 overflow-hidden rounded-t-2xl border-b border-border/60 bg-card/70 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${column.dot}`}
                />
                <h2
                  id={`column-${column.status}`}
                  className="truncate text-base font-semibold tracking-[-0.02em]"
                >
                  {column.step}. {column.title}
                </h2>
              </div>
              <span className="flex min-w-7 items-center justify-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-xs font-semibold tabular-nums">
                {counts[column.status]}
              </span>
            </header>
            <div className="min-h-64 space-y-3 p-3">
              {loading ? (
                [0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-64 animate-pulse rounded-xl bg-card motion-reduce:animate-none"
                  />
                ))
              ) : columnOrders.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-6 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ForkKnifeIcon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">
                    {searching ? "No matching tickets" : "Column clear"}
                  </p>
                  <p className="mt-1 max-w-52 text-xs leading-5 text-muted-foreground">
                    {searching
                      ? "Try a ticket number, dish, or kitchen note."
                      : column.empty}
                  </p>
                </div>
              ) : (
                columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    canAdvance={canAdvance}
                    readOnly={readOnly}
                    pending={pendingOrderId === order.id}
                    highlighted={highlightId === order.id}
                    onAdvance={onAdvance}
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
    </section>
  )
}

function OrderCard({
  order,
  now,
  canAdvance,
  readOnly,
  pending,
  highlighted = false,
  onAdvance,
}: {
  order: KitchenOrder & { status: ActiveStatus }
  now: number
  canAdvance: boolean
  readOnly: boolean
  pending: boolean
  highlighted?: boolean
  onAdvance: (order: KitchenOrder) => void
}) {
  const minutes = elapsedMinutes(order.createdAt, now)
  const isLate = minutes >= 20
  const ActionIcon = actionIcon[order.status]

  return (
    <article
      style={{ viewTransitionName: `ticket-${order.id}` }}
      className={`ticket-enter overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_oklch(0.25_0.03_155/0.06)] transition-[border-color,box-shadow] duration-500 motion-reduce:animate-none ${
        highlighted
          ? "border-secondary shadow-[0_0_0_2px_var(--secondary)]"
          : "border-border/75"
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold tracking-[0.01em] tabular-nums">
              {ticketNumber(order.id)}
            </p>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {diningLabel(order.diningType)}
          </p>
        </div>
        <span
          className={`inline-flex min-h-7 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${
            isLate
              ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <ClockIcon aria-hidden="true" className="size-3.5" />
          {elapsedLabel(order.createdAt, now)}
        </span>
      </div>

      <div className="mx-4 mt-3 border-t border-border/60" />
      <ul className="space-y-4 px-4 py-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3 text-sm">
            <MealImage name={item.name} imageUrl={item.imageUrl} size="md" />
            <div className="min-w-0">
              <p className="leading-5 font-semibold">
                <span className="mr-1 tabular-nums">{item.quantity}×</span>
                {item.name}
              </p>
              {item.modifiers.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-5 text-xs leading-4 text-muted-foreground">
                  {item.modifiers.map((modifier) => (
                    <li
                      key={modifier.id}
                      className="relative before:absolute before:-left-3 before:content-['•']"
                    >
                      {modifier.name}
                    </li>
                  ))}
                </ul>
              )}
              {item.notes && (
                <p className="mt-1.5 pl-5 text-xs leading-4 font-medium text-red-600 dark:text-red-400">
                  No / note: {item.notes}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="mx-4 mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
          <span className="font-semibold">Kitchen note:</span> {order.notes}
        </div>
      )}

      {!readOnly && (
        <div className="border-t border-border/60 p-3">
          <Button
            className="w-full"
            variant={order.status === "READY" ? "secondary" : "default"}
            onClick={() => onAdvance(order)}
            disabled={!canAdvance || pending}
          >
            {pending ? (
              <SpinnerGapIcon
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                data-icon="inline-start"
              />
            ) : (
              <ActionIcon aria-hidden="true" data-icon="inline-start" />
            )}
            {pending ? "Updating…" : actionLabel[order.status]}
            {!pending && (
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
            )}
          </Button>
        </div>
      )}
    </article>
  )
}

function TableView({
  orders,
  loading,
  now,
  canAdvance,
  readOnly,
  pendingOrderId,
  highlightId,
  onAdvance,
}: {
  orders: Array<KitchenOrder & { status: ActiveStatus }>
  loading: boolean
  now: number
  canAdvance: boolean
  readOnly: boolean
  pendingOrderId: string | null
  highlightId: string | null
  onAdvance: (order: KitchenOrder) => void
}) {
  if (loading) {
    return (
      <div className="mt-6 h-72 animate-pulse rounded-2xl border border-border/70 bg-muted/30 motion-reduce:animate-none" />
    )
  }
  if (orders.length === 0) {
    return (
      <StatePanel
        icon={<ForkKnifeIcon aria-hidden="true" />}
        title="No active tickets"
        description="New orders will appear here automatically as soon as the counter submits them."
      />
    )
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70 bg-card">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-muted/35 text-xs tracking-[0.08em] text-muted-foreground uppercase">
            <th className="px-4 py-3 font-semibold">Ticket</th>
            <th className="px-4 py-3 font-semibold">Items</th>
            <th className="px-4 py-3 font-semibold">Stage</th>
            <th className="px-4 py-3 font-semibold">Elapsed</th>
            {!readOnly && (
              <th className="px-4 py-3 text-right font-semibold">Action</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {orders.map((order) => {
            const ActionIcon = actionIcon[order.status]
            const pending = pendingOrderId === order.id
            const highlighted = highlightId === order.id
            return (
              <tr
                key={order.id}
                style={{ viewTransitionName: `ticket-row-${order.id}` }}
                className={`ticket-enter align-middle hover:bg-muted/20 ${
                  highlighted ? "bg-secondary/15" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <p className="font-semibold tabular-nums">
                    {ticketNumber(order.id)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {diningLabel(order.diningType)}
                  </p>
                </td>
                <td className="max-w-lg px-4 py-4">
                  <ul className="space-y-2">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 font-medium"
                      >
                        <MealImage
                          name={item.name}
                          imageUrl={item.imageUrl}
                          size="sm"
                        />
                        <span>
                          <span className="tabular-nums">{item.quantity}×</span>{" "}
                          {item.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {order.notes && (
                    <p className="mt-1 truncate text-xs text-amber-700 dark:text-amber-300">
                      {order.notes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <StatusPill status={order.status} />
                </td>
                <td className="px-4 py-4 text-muted-foreground tabular-nums">
                  {elapsedLabel(order.createdAt, now)}
                </td>
                {!readOnly && (
                  <td className="px-4 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canAdvance || pending}
                      onClick={() => onAdvance(order)}
                    >
                      {pending ? (
                        <SpinnerGapIcon
                          aria-hidden="true"
                          className="animate-spin motion-reduce:animate-none"
                          data-icon="inline-start"
                        />
                      ) : (
                        <ActionIcon
                          aria-hidden="true"
                          data-icon="inline-start"
                        />
                      )}
                      {pending ? "Updating…" : actionLabel[order.status]}
                    </Button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status }: { status: ActiveStatus }) {
  // Labels match the DB enum exactly: NEW / PREPARING / READY
  const label: Record<ActiveStatus, string> = {
    NEW: "NEW",
    PREPARING: "PREPARING",
    READY: "READY",
  }
  const style: Record<ActiveStatus, string> = {
    NEW: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    PREPARING:
      "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20",
    READY:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style[status]}`}
    >
      {label[status]}
    </span>
  )
}

function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/20 text-secondary [&>svg]:size-5">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
