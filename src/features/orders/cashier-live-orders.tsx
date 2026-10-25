import { gql } from "@apollo/client"
import { useQuery, useSubscription } from "@apollo/client/react"
import { ArrowClockwiseIcon } from "@phosphor-icons/react"
import { useEffect } from "react"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { diningLabel, orderStatusTone, statusLabels } from "./labels"
import type { DiningType } from "./labels"

const ACTIVE_ORDERS = gql`
  query CashierLiveOrders {
    activeOrders {
      id
      status
      diningType
      createdAt
      updatedAt
      notes
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
  }
`
const LIVE_ORDER_FIELDS = gql`
  fragment CashierLiveOrderFields on Order {
    id
    status
    diningType
    createdAt
    updatedAt
    notes
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
const ORDER_CREATED = gql`
  subscription CashierOrderCreated {
    orderCreated {
      ...CashierLiveOrderFields
    }
  }
  ${LIVE_ORDER_FIELDS}
`
const ORDER_CHANGED = gql`
  subscription CashierOrderChanged {
    orderStatusChanged {
      ...CashierLiveOrderFields
    }
  }
  ${LIVE_ORDER_FIELDS}
`

interface LiveOrder {
  id: string
  status: string
  diningType: DiningType
  createdAt: string
  updatedAt: string
  notes: string | null
  items: Array<{
    id: string
    name: string
    quantity: number
    notes: string | null
    imageUrl?: string | null
    modifiers: Array<{ id: string; name: string }>
  }>
}

function isActiveStatus(status: string) {
  return status === "NEW" || status === "PREPARING" || status === "READY"
}

interface CashierLiveData {
  activeOrders: LiveOrder[]
}

export function CashierLiveOrders() {
  const { data, loading, error, refetch } = useQuery<CashierLiveData>(
    ACTIVE_ORDERS,
    {
      fetchPolicy: "cache-and-network",
      // Fully websocket-driven: no pollInterval. Subscriptions below merge
      // into the cache; refetch is only a reconnect/error recovery path.
    }
  )
  const refresh = () => {
    void refetch().catch(() => undefined)
  }
  const created = useSubscription<{ orderCreated: LiveOrder }>(ORDER_CREATED, {
    onData({ client, data: subData }) {
      const order = subData.data?.orderCreated
      if (!order) return
      client.cache.updateQuery<CashierLiveData>(
        { query: ACTIVE_ORDERS },
        (prev) => {
          if (!prev) return prev
          const exists = prev.activeOrders.some((o) => o.id === order.id)
          return {
            activeOrders: exists
              ? prev.activeOrders.map((o) => (o.id === order.id ? order : o))
              : [...prev.activeOrders, order],
          }
        }
      )
    },
    onError: refresh,
  })
  const changed = useSubscription<{ orderStatusChanged: LiveOrder }>(
    ORDER_CHANGED,
    {
      onData({ client, data: subData }) {
        const order = subData.data?.orderStatusChanged
        if (!order) return
        client.cache.updateQuery<CashierLiveData>(
          { query: ACTIVE_ORDERS },
          (prev) => {
            if (!prev) return prev
            if (!isActiveStatus(order.status)) {
              return {
                activeOrders: prev.activeOrders.filter(
                  (o) => o.id !== order.id
                ),
              }
            }
            const exists = prev.activeOrders.some((o) => o.id === order.id)
            return {
              activeOrders: exists
                ? prev.activeOrders.map((o) => (o.id === order.id ? order : o))
                : [...prev.activeOrders, order],
            }
          }
        )
      },
      onError: refresh,
    }
  )
  // Reconcile anything missed while the socket was down.
  useEffect(() => {
    if (created.error || changed.error) return
    const onOnline = () => refresh()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [])
  // Most recently updated slides to the top with a view transition.
  const orders = (data?.activeOrders ?? [])
    .filter((order) => ["NEW", "PREPARING", "READY"].includes(order.status))
    .sort(
      (a, b) =>
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt)
    )

  return (
    <aside
      aria-label="Live orders"
      className="flex min-h-0 flex-col border-r border-border/70 bg-muted/20"
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border/70 p-4">
        <div>
          <h2 className="text-lg font-semibold">
            Orders{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">
              {orders.length}
            </span>
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh orders"
          title="Refresh orders"
          onClick={refresh}
          disabled={loading}
        >
          <ArrowClockwiseIcon aria-hidden="true" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/20 p-3 text-sm"
          >
            <p>
              Orders couldn’t refresh.{" "}
              {data ? "Showing the last available tickets." : "Try again."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={refresh}
            >
              Retry
            </Button>
          </div>
        )}
        {loading && !data ? (
          <LoadingState className="min-h-56" label="orders" />
        ) : !error && orders.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            No active orders. New tickets will appear here.
          </p>
        ) : null}
        {orders.map((order) => (
          <article
            key={order.id}
            style={{ viewTransitionName: `live-order-${order.id}` }}
            className="ticket-enter rounded-lg border border-border/70 bg-card p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tabular-nums">
                #{order.id.slice(-6).toUpperCase()}
              </h3>
              <StatusBadge tone={orderStatusTone(order.status)}>
                {statusLabels[order.status] ?? order.status}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {diningLabel(order.diningType)} ·{" "}
              {new Date(order.createdAt).toLocaleTimeString("en-GH", {
                timeZone: "Africa/Accra",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <ul className="mt-3 space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-8 shrink-0 rounded-md object-cover outline outline-black/10"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/20 text-xs font-bold text-secondary"
                    >
                      {(item.name.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p>
                      <span className="font-semibold tabular-nums">
                        {item.quantity} ×{" "}
                      </span>
                      {item.name}
                    </p>
                    {item.modifiers.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.modifiers
                          .map((modifier) => modifier.name)
                          .join(", ")}
                      </p>
                    )}
                    {item.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {order.notes && (
              <p className="mt-3 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                {order.notes}
              </p>
            )}
          </article>
        ))}
      </div>
    </aside>
  )
}
