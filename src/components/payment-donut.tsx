import { WalletIcon } from "@phosphor-icons/react"
import { EmptyState } from "@/components/content-state"

const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
})

function formatMoney(value: number) {
  return currency.format(value / 100)
}

export type PaymentBreakdown = Array<{
  method: "CASH" | "MOMO" | "TRANSFER"
  amount: number
}>

const paymentMethods = [
  { method: "CASH" as const, label: "Cash", color: "var(--chart-1)" },
  {
    method: "MOMO" as const,
    label: "Mobile money",
    color: "var(--chart-4)",
  },
  {
    method: "TRANSFER" as const,
    label: "Bank transfer",
    color: "var(--chart-5)",
  },
]

/**
 * Shared settled-sales donut (same visual as the home page): conic donut
 * with a settled total in the middle plus a per-method legend.
 */
export function PaymentDonut({ breakdown }: { breakdown: PaymentBreakdown }) {
  const methods = paymentMethods.map((paymentMethod) => ({
    ...paymentMethod,
    amount:
      breakdown.find((item) => item.method === paymentMethod.method)?.amount ??
      0,
  }))
  const total = methods.reduce((sum, item) => sum + item.amount, 0)
  if (total === 0)
    return (
      <EmptyState
        icon={<WalletIcon />}
        title="No settled payments yet."
        description="Payments will appear here once sales are settled in the selected period."
      />
    )
  let accumulatedPercentage = 0
  const donutBackground = total
    ? `conic-gradient(${methods
        .map((item) => {
          const start = accumulatedPercentage
          accumulatedPercentage += (item.amount / total) * 100
          return `${item.color} ${start}% ${accumulatedPercentage}%`
        })
        .join(", ")})`
    : "var(--muted)"

  return (
    <div>
      <div
        role="img"
        aria-label={`Settled sales total ${formatMoney(total)}, split across cash, mobile money, and bank transfer`}
        className="relative mx-auto flex size-44 items-center justify-center rounded-full"
        style={{ background: donutBackground }}
      >
        <div
          aria-hidden="true"
          className="flex size-28 flex-col items-center justify-center rounded-full bg-card shadow-[0_0_0_1px_oklch(0_0_0/0.04)] dark:shadow-[0_0_0_1px_oklch(1_0_0/0.08)]"
        >
          <span className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Settled
          </span>
          <span className="mt-1 max-w-24 truncate text-lg font-semibold tracking-[-0.025em] tabular-nums">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <ul className="mt-7 divide-y divide-border/60 border-y border-border/60">
        {methods.map((item) => {
          const percentage = total ? Math.round((item.amount / total) * 100) : 0
          return (
            <li
              key={item.method}
              className="flex min-h-12 items-center gap-3 py-2"
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 flex-1 text-xs font-medium">
                {item.label}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {percentage}%
              </span>
              <span className="w-24 text-right text-xs font-semibold tabular-nums">
                {formatMoney(item.amount)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function PaymentDonutSkeleton() {
  return (
    <div>
      <div className="mx-auto size-44 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
      <div className="mt-7 space-y-2">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-10 animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  )
}
