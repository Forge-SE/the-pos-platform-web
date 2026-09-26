import { useState } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import {
  diningLabel,
  statusLabels
  
} from "@/features/orders/labels"
import type {DiningType} from "@/features/orders/labels";
import { formatMoney } from "@/features/menu/model"

interface OwnerOrder {
  id: string
  status: string
  diningType: DiningType
  subtotal: number
  discount: number
  tip: number
  total: number
  notes: string | null
  createdAt: string
  payment: { method: string; amount: number } | null
  items: Array<{
    id: string
    name: string
    quantity: number
    lineTotal: number
    notes: string | null
    modifiers: Array<{ id: string; name: string; priceDelta: number }>
  }>
}

const RECENT_ORDERS = gql`
  query RecentOrders($limit: Int) {
    recentOrders(limit: $limit) {
      id
      status
      diningType
      subtotal
      discount
      tip
      total
      notes
      createdAt
      payment {
        method
        amount
      }
      items {
        id
        name
        quantity
        lineTotal
        notes
        modifiers {
          id
          name
          priceDelta
        }
      }
    }
  }
`

const paymentLabels: Record<string, string> = {
  CASH: "Cash",
  MOMO: "Mobile money",
  TRANSFER: "Transfer",
}

export function OwnerOrders() {
  const { data, loading, error } = useQuery<{ recentOrders: OwnerOrder[] }>(
    RECENT_ORDERS,
    {
      variables: { limit: 80 },
      pollInterval: 30_000,
    }
  )
  const [selected, setSelected] = useState<OwnerOrder | null>(null)
  const orders = data?.recentOrders ?? []

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every ticket from the counter. Open a row to see what was ordered and
          how it was paid.
        </p>
      </header>

      <section className="mt-6 overflow-hidden rounded-xl border border-border/70 bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Dining
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                  Loading orders…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-destructive">
                  Orders could not be loaded.
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-t border-border/70 hover:bg-muted/40"
                  onClick={() => setSelected(order)}
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      className="font-semibold tabular-nums underline-offset-4 hover:underline"
                    >
                      {order.id.slice(-6).toUpperCase()}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("en-GH", {
                      timeZone: "Africa/Accra",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {diningLabel(order.diningType)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {statusLabels[order.status] ?? order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatMoney(order.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[min(90svh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-5 shadow-lg">
            {selected && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Dialog.Title className="text-lg font-semibold tracking-[-0.03em]">
                      Ticket {selected.id.slice(-6).toUpperCase()}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                      {diningLabel(selected.diningType)} ·{" "}
                      {statusLabels[selected.status] ?? selected.status}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    aria-label="Close order"
                    className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
                  >
                    <XIcon aria-hidden="true" className="size-4" />
                  </Dialog.Close>
                </div>
                <ul className="mt-5 divide-y divide-border/70">
                  {selected.items.map((item) => (
                    <li key={item.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold">
                          {item.quantity}× {item.name}
                        </p>
                        <p className="text-sm tabular-nums">
                          {formatMoney(item.lineTotal)}
                        </p>
                      </div>
                      {item.modifiers.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.modifiers
                            .map((modifier) => modifier.name)
                            .join(" · ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {selected.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selected.notes}
                  </p>
                )}
                <dl className="mt-4 space-y-1 border-t border-border/70 pt-4 text-sm">
                  <Row
                    label="Subtotal"
                    value={formatMoney(selected.subtotal)}
                  />
                  {selected.discount > 0 && (
                    <Row
                      label="Discount"
                      value={`−${formatMoney(selected.discount)}`}
                    />
                  )}
                  {selected.tip > 0 && (
                    <Row
                      label="Kitchen tip"
                      value={`+${formatMoney(selected.tip)}`}
                    />
                  )}
                  <Row
                    label="Total"
                    value={formatMoney(selected.total)}
                    strong
                  />
                  <Row
                    label="Payment"
                    value={
                      selected.payment
                        ? `${paymentLabels[selected.payment.method] ?? selected.payment.method} · ${formatMoney(selected.payment.amount)}`
                        : "Unpaid"
                    }
                  />
                </dl>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${strong ? "pt-1 font-semibold" : "text-muted-foreground"}`}
    >
      <dt>{label}</dt>
      <dd className="text-foreground tabular-nums">{value}</dd>
    </div>
  )
}
