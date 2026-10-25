import { useState } from "react"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import { useUrlState } from "@/lib/url-state"
import { useTablePagination } from "@/lib/table-state"
import { ReceiptDialog } from "./receipt-dialog"
import { diningLabel, statusLabels } from "@/features/orders/labels"
import type { DiningType } from "@/features/orders/labels"
import { formatMoney } from "@/features/menu/model"
import { OrderAdjustments } from "./order-adjustments"
import { getAccessTokenProfile } from "@/lib/auth-token"

interface OwnerOrder {
  id: string
  status: string
  diningType: DiningType
  deliveryAddress: string | null
  subtotal: number
  discount: number
  taxAmount: number
  tip: number
  total: number
  isComp: boolean
  taxes: Array<{ name: string; amount: number; inclusive: boolean }>
  refunds: Array<{
    id: string
    amount: number
    reason: string
    createdAt: string
  }>
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
  query RecentOrders($limit: Int, $offset: Int) {
    recentOrders(limit: $limit, offset: $offset) {
      id
      status
      diningType
      deliveryAddress
      subtotal
      discount
      taxAmount
      tip
      total
      isComp
      taxes {
        name
        amount
        inclusive
      }
      refunds {
        id
        amount
        reason
        createdAt
      }
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

export function OwnerOrders({ switcher }: { switcher?: ReactNode }) {
  const [receiptOrderId, setReceiptOrderId] = useUrlState("receipt")
  const paging = useTablePagination("orders", 50, [10, 20, 50])
  const { data, loading, error, refetch } = useQuery<{
    recentOrders: OwnerOrder[]
  }>(RECENT_ORDERS, {
    variables: {
      limit: paging.pageSize + 1,
      offset: paging.pageIndex * paging.pageSize,
    },
    pollInterval: 30_000,
  })
  const [selected, setSelected] = useState<OwnerOrder | null>(null)
  const orders = data?.recentOrders ?? []
  const visible = orders.slice(0, paging.pageSize)
  const role = getAccessTokenProfile()?.role
  const canAdjust = role === "OWNER" || role === "MANAGER"

  return (
    <div className="content-page mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:px-8 lg:py-8">
      <header>
        {switcher && <div className="mb-5">{switcher}</div>}
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every ticket from the counter. Open a row to see what was ordered and
          how it was paid, or view its digital receipt.
        </p>
      </header>

      <section className="content-region mt-6 overflow-hidden rounded-md bg-card lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <DataTable
          ariaLabel="Orders"
          rows={visible}
          onRefresh={() => void refetch()}
          isLoading={loading}
          pagination={{
            ...paging,
            hasNextPage: orders.length > paging.pageSize,
            pageSizeOptions: [10, 20, 50],
          }}
        >
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
                <td colSpan={5}>
                  <LoadingState className="min-h-48" label="orders" />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5}>
                  <ErrorState
                    title="Orders could not be loaded."
                    onRetry={refetch}
                  />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title={
                      paging.pageIndex > 0
                        ? "No orders on this page."
                        : "No orders yet."
                    }
                    description="Tickets will appear here after they are placed."
                    action={
                      paging.pageIndex > 0 ? (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => paging.onPageChange(0)}
                        >
                          View newest orders
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => void refetch().catch(() => {})}
                        >
                          Check again
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              visible.map((order) => (
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
        </DataTable>
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
                {selected.deliveryAddress && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">
                      Delivery address
                    </p>
                    <p className="mt-1">{selected.deliveryAddress}</p>
                  </div>
                )}
                <dl className="mt-4 space-y-1 border-t border-border/70 pt-4 text-sm">
                  <Row
                    label="Subtotal"
                    value={formatMoney(selected.subtotal)}
                  />
                  {selected.discount > 0 && (
                    <Row
                      label={selected.isComp ? "Comp" : "Discount"}
                      value={`−${formatMoney(selected.discount)}`}
                    />
                  )}
                  {selected.tip > 0 && (
                    <Row
                      label="Kitchen tip"
                      value={`+${formatMoney(selected.tip)}`}
                    />
                  )}
                  {selected.taxes.map((tax) => (
                    <Row
                      key={tax.name}
                      label={`${tax.name}${tax.inclusive ? " (included)" : ""}`}
                      value={formatMoney(tax.amount)}
                    />
                  ))}
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
                        : selected.total === 0
                          ? "No payment due"
                          : "Unpaid"
                    }
                  />
                </dl>
                {selected.refunds.length > 0 && (
                  <dl className="mt-4 space-y-2 text-sm">
                    {selected.refunds.map((refund) => (
                      <Row
                        key={refund.id}
                        label={`Refund · ${refund.reason}`}
                        value={formatMoney(refund.amount)}
                      />
                    ))}
                  </dl>
                )}
                {canAdjust && (
                  <OrderAdjustments
                    key={selected.id}
                    order={selected}
                    onUpdated={() => {
                      setSelected(null)
                      void refetch()
                    }}
                  />
                )}
                <Button
                  className="mt-5 w-full"
                  variant="outline"
                  onClick={() => {
                    setReceiptOrderId(selected.id)
                    setSelected(null)
                  }}
                >
                  View digital receipt
                </Button>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <ReceiptDialog
        orderId={receiptOrderId}
        open={Boolean(receiptOrderId)}
        onOpenChange={(open) => !open && setReceiptOrderId(null)}
      />
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
