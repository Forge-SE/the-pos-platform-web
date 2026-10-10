import {
  CaretRightIcon,
  ChartLineUpIcon,
  ClockIcon,
  CoinsIcon,
  ReceiptIcon,
  XIcon,
  UsersThreeIcon,
  WalletIcon,
} from "@phosphor-icons/react"
import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"

import { PaymentDonut, PaymentDonutSkeleton } from "@/components/payment-donut"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InfoTooltip } from "@/components/info-tooltip"
import { LoadingState } from "@/components/loading-state"
import { formatMoney, averageOrderValue } from "@/features/performance/model"
import type {
  CurrentShift,
  PerformanceData,
  StaffRosterData,
} from "@/features/performance/model"

function Card({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function LoadingBars() {
  return <LoadingState label="performance data" />
}

export function HeroStats({
  sales,
  salesLoading,
  periodLabel,
}: {
  sales?: PerformanceData["salesSummary"]
  salesLoading: boolean
  periodLabel: string
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const total = sales?.totalSales ?? 0
  const count = sales?.orderCount ?? 0
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <WalletIcon aria-hidden="true" className="size-4" />
            Net revenue
          </div>
          <InfoTooltip label="About net revenue">
            Sales after discounts, comps, and refunded sales. Tax and tips are
            excluded.
          </InfoTooltip>
        </div>
        <p className="mt-3 truncate text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {salesLoading ? "—" : formatMoney(total)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 h-auto justify-between border-0 px-0 text-xs font-medium text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground"
          onClick={() => setBreakdownOpen(true)}
        >
          Revenue breakdown
          <CaretRightIcon aria-hidden="true" className="size-4" />
        </Button>
      </article>
      <article className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ReceiptIcon aria-hidden="true" className="size-4" />
            Completed orders
          </div>
          <InfoTooltip label="About completed orders">
            Number of completed orders in the selected date range.
          </InfoTooltip>
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {salesLoading ? "—" : count}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
      </article>
      <article className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ChartLineUpIcon aria-hidden="true" className="size-4" />
            Average net order value
          </div>
          <InfoTooltip label="About average net order value">
            Net revenue divided by completed orders in the selected period.
          </InfoTooltip>
        </div>
        <p className="mt-3 truncate text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {salesLoading || !sales ? "—" : formatMoney(averageOrderValue(sales))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
      </article>
      <Dialog.Root open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(24rem,90vw)] flex-col border-l border-border/70 bg-card p-5 text-card-foreground shadow-xl outline-none data-ending-style:translate-x-full data-starting-style:translate-x-full sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <Dialog.Title className="text-lg font-semibold tracking-[-0.025em]">
                  Revenue breakdown
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {periodLabel}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close revenue breakdown"
                    title="Close"
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                }
              />
            </div>
            <dl className="content-region mt-5 flex-1 space-y-3 overflow-y-auto text-sm">
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  Gross sales
                  <InfoTooltip label="About gross sales">
                    Historical gross sales are reconstructed estimates.
                  </InfoTooltip>
                </dt>
                <dd className="font-semibold tabular-nums">
                  {salesLoading ? "—" : formatMoney(sales?.grossSales ?? 0)}
                </dd>
              </div>
              <BreakdownRow
                label="Discounts"
                amount={sales?.discounts}
                loading={salesLoading}
              />
              <BreakdownRow
                label="Comps"
                amount={sales?.comps}
                loading={salesLoading}
              />
              <BreakdownRow
                label="Refunded sales"
                amount={sales?.refundedSales}
                loading={salesLoading}
              />
              <BreakdownRow
                label="Net revenue"
                amount={sales?.netRevenue}
                loading={salesLoading}
              />
              <BreakdownRow
                label="Tax collected"
                amount={sales?.taxCollected}
                loading={salesLoading}
              />
              <BreakdownRow
                label="Tips"
                amount={sales?.tips}
                loading={salesLoading}
              />
              <BreakdownRow
                label="Total collected"
                amount={sales?.totalCollected}
                loading={salesLoading}
              />
              <BreakdownRow
                label="Refunds paid out"
                amount={sales?.refundsTotal}
                loading={salesLoading}
              />
            </dl>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

export function PaymentSplitCard({
  sales,
  salesLoading,
  periodLabel,
}: {
  sales?: PerformanceData["salesSummary"]
  salesLoading: boolean
  periodLabel: string
}) {
  return (
    <Card
      title="Payment method split"
      description={`How settled sales were collected · ${periodLabel}`}
      action={
        <InfoTooltip label="About payment method split">
          Payment totals include tax and tips and follow collection dates.
        </InfoTooltip>
      }
    >
      {salesLoading ? (
        <PaymentDonutSkeleton />
      ) : (
        <PaymentDonut breakdown={sales?.paymentBreakdown ?? []} />
      )}
    </Card>
  )
}

function BreakdownRow({
  label,
  amount,
  loading,
}: {
  label: string
  amount?: number
  loading: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {loading ? "—" : formatMoney(amount ?? 0)}
      </dd>
    </div>
  )
}

export function ShiftProgressCard({
  shift,
  orders,
}: {
  shift: CurrentShift | null
  orders: PerformanceData["activeOrders"]
}) {
  const inProgress = {
    NEW: orders.filter((order) => order.status === "NEW").length,
    PREPARING: orders.filter((order) => order.status === "PREPARING").length,
    READY: orders.filter((order) => order.status === "READY").length,
  }
  return (
    <Card
      title="Shift & orders in progress"
      description="Current shift and live order pipeline."
      action={
        shift ? (
          <Badge
            variant="outline"
            className="border-transparent bg-primary/25 text-primary-foreground"
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-secondary"
            />
            Shift open
          </Badge>
        ) : null
      }
    >
      <div className="space-y-4">
        {shift && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ClockIcon aria-hidden="true" className="size-4" />
              Opened{" "}
              {new Date(shift.openedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CoinsIcon aria-hidden="true" className="size-4" />
              Float {formatMoney(shift.openingFloat)}
            </span>
          </div>
        )}
        <ul className="grid grid-cols-3 gap-3">
          {(
            [
              { label: "New", value: inProgress.NEW },
              { label: "Preparing", value: inProgress.PREPARING },
              { label: "Ready", value: inProgress.READY },
            ] as const
          ).map((stage) => (
            <li
              key={stage.label}
              className="rounded-lg bg-muted/35 px-3 py-3 text-center"
            >
              <p className="text-2xl font-semibold tabular-nums">
                {stage.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stage.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

export function RosterCard({
  staff,
  staffLoading,
}: {
  staff?: StaffRosterData["staff"]
  staffLoading: boolean
}) {
  return (
    <Card
      title="Staff roster"
      description="Everyone with access to this restaurant."
      action={
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UsersThreeIcon aria-hidden="true" className="size-4" />
          {staff?.length ?? 0} staff
        </span>
      }
    >
      {staffLoading ? (
        <LoadingBars />
      ) : (
        <ul className="divide-y divide-border/60">
          {(staff ?? []).map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${member.active ? "bg-secondary" : "bg-muted-foreground/40"}`}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {member.name}
              </span>
              <Badge variant="outline" className="capitalize">
                {member.role.toLowerCase()}
              </Badge>
            </li>
          ))}
          {(staff ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No staff accounts yet.
            </li>
          )}
        </ul>
      )}
    </Card>
  )
}
