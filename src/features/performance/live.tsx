import {
  ChartLineUpIcon,
  ClockIcon,
  CoinsIcon,
  ReceiptIcon,
  UsersThreeIcon,
  WalletIcon,
} from "@phosphor-icons/react"

import { PaymentDonut, PaymentDonutSkeleton } from "@/components/payment-donut"
import { Badge } from "@/components/ui/badge"
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
  return (
    <div className="space-y-3" aria-label="Loading">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-12 animate-pulse rounded-lg bg-muted/70 motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}

export function HeroStats({
  sales,
  salesLoading,
}: {
  sales?: PerformanceData["salesToday"]
  salesLoading: boolean
}) {
  const total = sales?.totalSales ?? 0
  const count = sales?.orderCount ?? 0
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <WalletIcon aria-hidden="true" className="size-4" />
          Today&apos;s revenue
        </div>
        <p className="mt-3 truncate text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {salesLoading ? "—" : formatMoney(total)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Settled sales today
        </p>
      </article>
      <article className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ReceiptIcon aria-hidden="true" className="size-4" />
          Orders today
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {salesLoading ? "—" : count}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Completed orders</p>
      </article>
      <article className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ChartLineUpIcon aria-hidden="true" className="size-4" />
          Average order value
        </div>
        <p className="mt-3 truncate text-3xl font-semibold tracking-[-0.03em] tabular-nums">
          {salesLoading || !sales ? "—" : formatMoney(averageOrderValue(sales))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Revenue ÷ orders, calculated live
        </p>
      </article>
    </div>
  )
}

export function PaymentSplitCard({
  sales,
  salesLoading,
}: {
  sales?: PerformanceData["salesToday"]
  salesLoading: boolean
}) {
  return (
    <Card
      title="Payment method split"
      description="How today's settled sales were collected."
    >
      {salesLoading ? (
        <PaymentDonutSkeleton />
      ) : (
        <PaymentDonut breakdown={sales?.paymentBreakdown ?? []} />
      )}
    </Card>
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
