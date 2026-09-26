import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"
import { isSameDay } from "date-fns"

import { DateRangePicker, defaultPresets } from "@/components/date-range-picker"
import type { DateRange } from "@/components/date-range-picker"
import { SectionPage } from "@/components/layout/section-page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShareBars } from "@/features/ops/ops-charts"
import { diningLabel, statusLabels } from "@/features/orders/labels"
import { formatMoney } from "@/features/menu/model"
import { useUrlState } from "@/lib/url-state"

const SHIFTS_QUERY = gql`
  query ShiftList($from: DateTime!, $to: DateTime!) {
    shifts(from: $from, to: $to) {
      id
      status
      openedAt
      closedAt
      openingFloat
      orderCount
      revenue
    }
  }
`

const SHIFT_REPORT_QUERY = gql`
  query ShiftReport($id: ID!) {
    shiftReport(id: $id) {
      id
      status
      openedAt
      closedAt
      openingFloat
      expectedCash
      countedCash
      variance
      orderCount
      revenue
      averageTicket
      orders {
        id
        createdAt
        diningType
        status
        total
        paid
      }
      byMethod {
        label
        count
        amount
      }
      byDining {
        label
        count
        amount
      }
    }
  }
`

interface ShiftListItem {
  id: string
  status: string
  openedAt: string
  closedAt: string | null
  openingFloat: number
  orderCount: number
  revenue: number
}

interface ShiftSlice {
  label: string
  count: number
  amount: number
}

interface ShiftReport {
  id: string
  status: string
  openedAt: string
  closedAt: string | null
  openingFloat: number
  expectedCash: number | null
  countedCash: number | null
  variance: number | null
  orderCount: number
  revenue: number
  averageTicket: number
  orders: Array<{
    id: string
    createdAt: string
    diningType: string
    status: string
    total: number
    paid: boolean
  }>
  byMethod: ShiftSlice[]
  byDining: ShiftSlice[]
}

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  MOMO: "MoMo",
  TRANSFER: "Transfer",
}

function bounds(range: DateRange | undefined) {
  const start = range?.from ?? new Date()
  const finish = range?.to ?? start
  const from = new Date(start)
  from.setHours(0, 0, 0, 0)
  const to = new Date(finish)
  to.setHours(0, 0, 0, 0)
  to.setDate(to.getDate() + 1)
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatWhen(value: string | null) {
  if (!value) return "Still open"
  return new Date(value).toLocaleString("en-GH", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: "Africa/Accra",
  })
}

export function ShiftReview() {
  const [rangeParam, setRangeParam] = useUrlState("range")
  const [fromParam, setFromParam] = useUrlState("from")
  const [toParam, setToParam] = useUrlState("to")
  const [shiftParam, setShiftParam] = useUrlState("shift")
  const [tabParam, setTabParam] = useUrlState("shiftTab")
  const tab = tabParam === "revenue" ? "revenue" : "orders"
  const presets = defaultPresets()
  const range: DateRange | undefined =
    rangeParam === "custom" && fromParam
      ? { from: new Date(fromParam), to: toParam ? new Date(toParam) : undefined }
      : (presets.find((preset) => preset.id === (rangeParam ?? "30d"))?.dateRange ??
        presets[2].dateRange)
  const { from, to } = bounds(range)
  const list = useQuery<{ shifts: ShiftListItem[] }>(SHIFTS_QUERY, {
    variables: { from, to },
  })
  const report = useQuery<{ shiftReport: ShiftReport }>(SHIFT_REPORT_QUERY, {
    variables: { id: shiftParam ?? "" },
    skip: !shiftParam,
  })
  const rows = list.data?.shifts ?? []
  const detail = report.data?.shiftReport

  function handleRangeChange(next: DateRange | undefined) {
    setShiftParam(null)
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
    <SectionPage
      title="Shifts"
      description="Every register sitting in the range. Open one to see its orders and revenue."
    >
      <div className="mt-6">
        <DateRangePicker value={range} onChange={handleRangeChange} />
      </div>
      {list.error && (
        <p className="mt-6 text-sm text-destructive" role="alert">
          Could not load shifts.
        </p>
      )}
      <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/70 bg-muted/40 text-xs tracking-[0.06em] text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Opened</th>
              <th className="px-4 py-3 font-medium">Closed</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Orders</th>
              <th className="px-4 py-3 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/30 ${
                  shiftParam === row.id ? "bg-primary/15" : ""
                }`}
                onClick={() => {
                  setShiftParam(row.id)
                  setTabParam("orders")
                }}
              >
                <td className="px-4 py-3">{formatWhen(row.openedAt)}</td>
                <td className="px-4 py-3">{formatWhen(row.closedAt)}</td>
                <td className="px-4 py-3">
                  <Badge variant={row.status === "OPEN" ? "secondary" : "outline"}>
                    {row.status === "OPEN" ? "Open" : "Closed"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.orderCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.loading && rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No shifts in this range.
          </p>
        )}
      </div>

      <Dialog.Root
        open={shiftParam !== null}
        onOpenChange={(open) => {
          if (!open) setShiftParam(null)
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-foreground/10 px-4 pt-4 pb-3 sm:px-5">
              <div>
                <Dialog.Title className="text-lg font-semibold tracking-[-0.025em]">
                  {detail ? formatWhen(detail.openedAt) : "Shift"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {detail
                    ? `Started ${formatWhen(detail.openedAt)} · ${detail.closedAt ? `Ended ${formatWhen(detail.closedAt)}` : "Still open"}`
                    : "Loading this shift…"}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Close dialog">
                    <XIcon />
                  </Button>
                }
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {report.loading && <p className="text-sm text-muted-foreground">Loading this shift…</p>}
          {detail && (
            <>
              <dl className="grid gap-3 sm:grid-cols-4">
                <Stat label="Orders" value={String(detail.orderCount)} />
                <Stat label="Revenue" value={formatMoney(detail.revenue)} />
                <Stat label="Average ticket" value={formatMoney(detail.averageTicket)} />
                <Stat label="Opening float" value={formatMoney(detail.openingFloat)} />
              </dl>
              <div className="mt-5 flex gap-1 border-b border-border/70" role="tablist">
                {(
                  [
                    ["orders", "Orders"],
                    ["revenue", "Revenue"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTabParam(id)}
                    className={`border-b-2 px-3 py-2 text-sm font-medium ${
                      tab === id
                        ? "border-secondary text-foreground"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === "orders" && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs tracking-[0.06em] text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2 pr-3 font-medium">When</th>
                        <th className="py-2 pr-3 font-medium">Dining</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Payment</th>
                        <th className="py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.orders.map((order) => (
                        <tr key={order.id} className="border-t border-border/50">
                          <td className="py-2.5 pr-3">{formatWhen(order.createdAt)}</td>
                          <td className="py-2.5 pr-3">{diningLabel(order.diningType)}</td>
                          <td className="py-2.5 pr-3">{statusLabels[order.status] ?? order.status}</td>
                          <td className="py-2.5 pr-3">{order.paid ? "Paid" : "Unpaid"}</td>
                          <td className="py-2.5 text-right tabular-nums">{formatMoney(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detail.orders.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No orders on this shift.
                    </p>
                  )}
                </div>
              )}
              {tab === "revenue" && (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <ShareBars
                    title="By payment method"
                    countLabel="payments"
                    valueLabel="Revenue"
                    rows={detail.byMethod.map((slice) => ({
                      label: methodLabels[slice.label] ?? slice.label,
                      orderCount: slice.count,
                      revenue: slice.amount,
                    }))}
                  />
                  <ShareBars
                    title="By dining"
                    valueLabel="Revenue"
                    rows={detail.byDining.map((slice) => ({
                      label: diningLabel(slice.label),
                      orderCount: slice.count,
                      revenue: slice.amount,
                    }))}
                  />
                  {detail.closedAt && (
                    <dl className="rounded-xl border border-border/70 p-4 text-sm lg:col-span-2">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Expected cash</dt>
                        <dd>{detail.expectedCash == null ? "—" : formatMoney(detail.expectedCash)}</dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <dt className="text-muted-foreground">Counted cash</dt>
                        <dd>{detail.countedCash == null ? "—" : formatMoney(detail.countedCash)}</dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <dt className="text-muted-foreground">Variance</dt>
                        <dd>{detail.variance == null ? "—" : formatMoney(detail.variance)}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}
            </>
          )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </SectionPage>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
