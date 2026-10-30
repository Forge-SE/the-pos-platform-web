import { AdaptiveDialogPopup } from "@/components/mobile/adaptive-dialog-popup"
import { useState } from "react"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { isSameDay } from "date-fns"
import { XIcon } from "@phosphor-icons/react"

import { DateRangePicker, defaultPresets } from "@/components/date-range-picker"
import type { DateRange } from "@/components/date-range-picker"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { useLanguage } from "@/components/language-provider"
import { useUrlState } from "@/lib/url-state"
import { useTablePagination } from "@/lib/table-state"
import { ReceiptDialog } from "./receipt-dialog"
import {
  diningLabel,
  orderStatusTone,
  statusLabels,
} from "@/features/orders/labels"
import type { DiningType } from "@/features/orders/labels"
import { formatMoney } from "@/features/menu/model"
import { OrderAdjustments } from "./order-adjustments"
import { getAccessTokenProfile } from "@/lib/auth-token"

interface OwnerOrder {
  id: string
  ticketNumber: string
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
  createdBy: { id: string; name: string }
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
  query RecentOrders(
    $limit: Int
    $offset: Int
    $search: String
    $status: OrderStatus
    $createdBy: ID
    $from: DateTime
    $to: DateTime
  ) {
    recentOrders(
      limit: $limit
      offset: $offset
      search: $search
      status: $status
      createdBy: $createdBy
      from: $from
      to: $to
    ) {
      id
      ticketNumber
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
      createdBy {
        id
        name
      }
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

const ORDER_CREATORS = gql`
  query OrderCreators {
    orderCreators {
      id
      name
    }
  }
`

const paymentLabels: Record<string, string> = {
  CASH: "Cash",
  MOMO: "Mobile money",
  TRANSFER: "Transfer",
}

function rangeBounds(range: DateRange | undefined) {
  if (!range?.from) return { from: null, to: null }
  const start = new Date(range.from)
  start.setHours(0, 0, 0, 0)
  const finish = new Date(range.to ?? range.from)
  finish.setHours(0, 0, 0, 0)
  finish.setDate(finish.getDate() + 1)
  return { from: start.toISOString(), to: finish.toISOString() }
}

export function OwnerOrders({ switcher }: { switcher?: ReactNode }) {
  const { t, locale } = useLanguage()
  const [receiptOrderId, setReceiptOrderId] = useUrlState("receipt")
  const [search, setSearch] = useUrlState("orderSearch")
  const [status, setStatus] = useUrlState("orderStatus")
  const [creator, setCreator] = useUrlState("orderCreator")
  const [rangeParam, setRangeParam] = useUrlState("orderRange")
  const [fromParam, setFromParam] = useUrlState("orderFrom")
  const [toParam, setToParam] = useUrlState("orderTo")
  const paging = useTablePagination("orders", 50, [10, 20, 50])
  const presets = defaultPresets()
  const range: DateRange | undefined =
    rangeParam === "custom" && fromParam
      ? {
          from: new Date(fromParam),
          to: toParam ? new Date(toParam) : undefined,
        }
      : presets.find((preset) => preset.id === rangeParam)?.dateRange
  const bounds = rangeBounds(range)
  const statusFilter = status && status in statusLabels ? status : null
  const creators = useQuery<{
    orderCreators: Array<{ id: string; name: string }>
  }>(ORDER_CREATORS)
  const creatorFilter = creator || null
  const { data, loading, error, refetch } = useQuery<{
    recentOrders: OwnerOrder[]
  }>(RECENT_ORDERS, {
    variables: {
      limit: paging.pageSize + 1,
      offset: paging.pageIndex * paging.pageSize,
      search: search?.trim() || null,
      status: statusFilter,
      createdBy: creatorFilter,
      from: bounds.from,
      to: bounds.to,
    },
    pollInterval: 30_000,
  })
  const [selected, setSelected] = useState<OwnerOrder | null>(null)
  const orders = data?.recentOrders ?? []
  const visible = orders.slice(0, paging.pageSize)
  const role = getAccessTokenProfile()?.role
  const canAdjust = role === "OWNER" || role === "MANAGER"
  const filtered = Boolean(
    search?.trim() || statusFilter || creatorFilter || range?.from
  )

  function handleRangeChange(next: DateRange | undefined) {
    paging.resetPage()
    if (!next?.from) {
      setRangeParam(null)
      setFromParam(null)
      setToParam(null)
      return
    }
    const nextFrom = next.from
    const nextTo = next.to
    const match = presets.find((preset) => {
      const presetFrom = preset.dateRange.from
      const presetTo = preset.dateRange.to
      return (
        presetFrom != null &&
        presetTo != null &&
        nextTo != null &&
        isSameDay(nextFrom, presetFrom) &&
        isSameDay(nextTo, presetTo)
      )
    })
    if (match) {
      setRangeParam(match.id)
      setFromParam(null)
      setToParam(null)
    } else {
      setRangeParam("custom")
      setFromParam(nextFrom.toISOString())
      setToParam(nextTo ? nextTo.toISOString() : null)
    }
  }

  return (
    <div className="content-page mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:px-8 lg:py-8">
      <header>
        {switcher && <div className="mb-5 hidden lg:block">{switcher}</div>}
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">
          {t("Orders")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Every ticket from the counter. Open a row to see what was ordered and how it was paid, or view its digital receipt."
          )}
        </p>
      </header>

      <section className="content-region mt-6 overflow-hidden rounded-md bg-card lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <DataTable
          ariaLabel={t("Orders")}
          mobileFeedKey={JSON.stringify([
            search,
            statusFilter,
            creatorFilter,
            rangeParam,
            fromParam,
            toParam,
          ])}
          mobilePageError={Boolean(error)}
          mobileFieldRoles={[
            "identity",
            "meta",
            "status",
            "amount",
            "meta",
            "detail",
          ]}
          rows={visible}
          search={{
            value: search ?? "",
            onChange: (value) => {
              setSearch(value || null)
              paging.resetPage()
            },
            placeholder: t("Search tickets, meals, or notes"),
          }}
          filters={
            <>
              <Select
                value={statusFilter ?? "ALL"}
                onValueChange={(value) => {
                  setStatus(value === "ALL" ? null : value)
                  paging.resetPage()
                }}
              >
                <SelectTrigger
                  className="w-40"
                  aria-label={t("Filter by status")}
                >
                  <SelectValue>
                    {(value) =>
                      typeof value === "string" && value in statusLabels
                        ? t(statusLabels[value])
                        : t("All statuses")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("All statuses")}</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {t(label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={
                  creators.data?.orderCreators.some(
                    (member) => member.id === creatorFilter
                  )
                    ? creatorFilter
                    : "ALL"
                }
                onValueChange={(value) => {
                  setCreator(!value || value === "ALL" ? null : value)
                  paging.resetPage()
                }}
              >
                <SelectTrigger
                  className="w-44"
                  aria-label={t("Filter by creator")}
                >
                  <SelectValue>
                    {(value) =>
                      creators.data?.orderCreators.find(
                        (member) => member.id === value
                      )?.name ?? t("All staff")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("All staff")}</SelectItem>
                  {(creators.data?.orderCreators ?? []).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DateRangePicker value={range} onChange={handleRangeChange} />
            </>
          }
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
              <th className="px-4 py-3 font-medium">{t("Ticket")}</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                {t("Dining")}
              </th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Total")}</th>
              <th className="px-4 py-3 font-medium">{t("Created at")}</th>
              <th className="px-4 py-3 font-medium">{t("Created by")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <LoadingState className="min-h-48" label={t("orders")} />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6}>
                  <ErrorState
                    title={t("Orders could not be loaded.")}
                    onRetry={refetch}
                  />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title={
                      paging.pageIndex > 0
                        ? t("No orders on this page.")
                        : filtered
                          ? t("No orders match these filters.")
                          : t("No orders yet.")
                    }
                    description={
                      filtered
                        ? t(
                            "Try another ticket, status, staff member, or date range."
                          )
                        : t("Tickets will appear here after they are placed.")
                    }
                    action={
                      paging.pageIndex > 0 ? (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => paging.onPageChange(0)}
                        >
                          {t("View newest orders")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => void refetch().catch(() => {})}
                        >
                          {t("Check again")}
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
                      {order.ticketNumber}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {t(diningLabel(order.diningType))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={orderStatusTone(order.status)}>
                      {t(statusLabels[order.status] ?? order.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatMoney(order.total)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString(locale, {
                      timeZone: "Africa/Accra",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{order.createdBy.name}</td>
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
          <AdaptiveDialogPopup
            mobileClassName="px-5"
            className="fixed top-1/2 left-1/2 z-50 max-h-[min(90svh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-5 shadow-lg"
          >
            {selected && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Dialog.Title className="text-lg font-semibold tracking-[-0.03em]">
                      {t("Ticket")} {selected.ticketNumber}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      {t(diningLabel(selected.diningType))} ·{" "}
                      {selected.createdBy.name}
                      <StatusBadge tone={orderStatusTone(selected.status)}>
                        {t(statusLabels[selected.status] ?? selected.status)}
                      </StatusBadge>
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    aria-label={t("Close order")}
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
                      {t("Delivery address")}
                    </p>
                    <p className="mt-1">{selected.deliveryAddress}</p>
                  </div>
                )}
                <dl className="mt-4 space-y-1 border-t border-border/70 pt-4 text-sm">
                  <Row
                    label={t("Subtotal")}
                    value={formatMoney(selected.subtotal)}
                  />
                  {selected.discount > 0 && (
                    <Row
                      label={t(selected.isComp ? "Comp" : "Discount")}
                      value={`−${formatMoney(selected.discount)}`}
                    />
                  )}
                  {selected.tip > 0 && (
                    <Row
                      label={t("Kitchen tip")}
                      value={`+${formatMoney(selected.tip)}`}
                    />
                  )}
                  {selected.taxes.map((tax) => (
                    <Row
                      key={tax.name}
                      label={`${tax.name}${tax.inclusive ? t(" (included)") : ""}`}
                      value={formatMoney(tax.amount)}
                    />
                  ))}
                  <Row
                    label={t("Total")}
                    value={formatMoney(selected.total)}
                    strong
                  />
                  <Row
                    label={t("Payment")}
                    value={
                      selected.payment
                        ? `${t(paymentLabels[selected.payment.method] ?? selected.payment.method)} · ${formatMoney(selected.payment.amount)}`
                        : selected.total === 0
                          ? t("No payment due")
                          : t("Unpaid")
                    }
                  />
                </dl>
                {selected.refunds.length > 0 && (
                  <dl className="mt-4 space-y-2 text-sm">
                    {selected.refunds.map((refund) => (
                      <Row
                        key={refund.id}
                        label={`${t("Refund")} · ${refund.reason}`}
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
                  {t("View digital receipt")}
                </Button>
              </>
            )}
          </AdaptiveDialogPopup>
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
