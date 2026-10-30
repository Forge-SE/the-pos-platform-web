import type { ReactNode } from "react"
import { MagnifyingGlassIcon, ReceiptIcon } from "@phosphor-icons/react"
import { useLanguage } from "@/components/language-provider"
import { MobileMetricGroup } from "@/components/mobile/mobile-metric-group"
import type { MobileMetric } from "@/components/mobile/mobile-metric-group"
import {
  MobileRecordRow,
  MobileFlatList,
} from "@/components/mobile/mobile-flat-list"
import { MobileSheet } from "@/components/layout/mobile/mobile-sheet"
import { useMobilePanel } from "@/components/layout/mobile/use-mobile-panel"
import { ContentState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { useUrlState } from "@/lib/url-state"
import {
  diningLabel,
  orderStatusTone,
  statusLabels,
} from "@/features/orders/labels"
import {
  elapsedLabel,
  formatMoney,
  greeting,
  paymentLabels,
} from "../overview-model"
import type { ActiveOrder } from "../overview-model"

export function MobileOverview({
  name,
  metrics,
  orders,
  loading,
  metricsBusy = loading,
  error,
  onRetry,
  search,
  onSearchChange,
  action,
  shiftNotice,
  shiftActionError,
  paymentMix,
  digest,
}: {
  name: string
  metrics: MobileMetric[]
  orders: ActiveOrder[]
  loading: boolean
  metricsBusy?: boolean
  error: boolean
  onRetry: () => Promise<void>
  search: string
  onSearchChange: (value: string) => void
  action: ReactNode
  shiftNotice?: ReactNode
  shiftActionError: string | null
  paymentMix?: ReactNode
  digest?: ReactNode
}) {
  const { t, locale, language } = useLanguage()
  const [selectedId, setSelectedId] = useUrlState("overviewOrder")
  const panel = useMobilePanel("overview-order")
  const selected = orders.find((order) => order.id === selectedId)
  const badge = (order: ActiveOrder) => (
    <StatusBadge tone={orderStatusTone(order.status)}>
      {t(statusLabels[order.status])}
    </StatusBadge>
  )
  return (
    <div className="min-w-0 space-y-6 px-4 pt-3 pb-20">
      <div>
        <p className="text-xs text-muted-foreground">
          {new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="min-w-0 text-2xl font-semibold tracking-tight">
            {t(greeting())}, {name}
          </h2>
          {action}
        </div>
        {shiftActionError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {shiftActionError}
          </p>
        )}
      </div>
      {shiftNotice}
      <MobileMetricGroup
        items={metrics}
        label={t("Today at a glance")}
        busy={metricsBusy}
      />
      <section aria-labelledby="mobile-active-orders">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="mobile-active-orders"
            className="text-lg font-semibold tracking-tight"
          >
            {t("Active orders")}
          </h2>
          {!loading && !error && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs tabular-nums">
              {orders.length} {t("live")}
            </span>
          )}
        </div>
        <label className="relative mt-3 block">
          <span className="sr-only">{t("Search orders")}</span>
          <MagnifyingGlassIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("Search orders")}
            className="h-11 pl-9"
          />
        </label>
        <div className="mt-2">
          {error ? (
            <ErrorState
              title="We couldn’t load live operations"
              description="Check your connection, then try loading the latest shift and order activity again."
              onRetry={onRetry}
            />
          ) : loading ? (
            <LoadingState label="active orders" />
          ) : (
            <MobileFlatList
              label={t("Active orders")}
              items={orders}
              getKey={(order) => order.id}
              empty={
                <ContentState
                  icon={<ReceiptIcon />}
                  title={t(search ? "No matching orders" : "No active orders")}
                  description={t(
                    search
                      ? "Try a different order number or item name."
                      : "New orders will appear here as soon as service begins."
                  )}
                  action={
                    search ? (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => onSearchChange("")}
                      >
                        {t("Clear search")}
                      </Button>
                    ) : undefined
                  }
                />
              }
              renderItem={(order) => (
                <MobileRecordRow
                  title={`#${order.ticketNumber}`}
                  subtitle={elapsedLabel(order.createdAt, language)}
                  badge={badge(order)}
                  amount={formatMoney(order.total)}
                  fields={[
                    {
                      label: t("Dining"),
                      value: t(diningLabel(order.diningType)),
                    },
                    {
                      label: t("Payment"),
                      value: order.payment
                        ? t(paymentLabels[order.payment.method])
                        : t("Unpaid"),
                    },
                  ]}
                  onOpen={() => {
                    setSelectedId(order.id)
                    panel.onOpenChange(true)
                  }}
                  openLabel={`${t("View order")} #${order.ticketNumber}`}
                >
                  <span className="line-clamp-2 text-muted-foreground">
                    {order.items
                      .map((item) => `${item.quantity}× ${item.name}`)
                      .join(" · ")}
                  </span>
                  {(order.notes || order.items.some((item) => item.notes)) && (
                    <span className="mt-1 block text-xs font-medium text-destructive">
                      {t("Order notes")}
                    </span>
                  )}
                </MobileRecordRow>
              )}
            />
          )}
        </div>
      </section>
      {paymentMix}
      {digest}
      <MobileSheet
        open={panel.open}
        onOpenChange={panel.onOpenChange}
        title={selected ? `#${selected.ticketNumber}` : "Order details"}
        description="Order details"
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              {badge(selected)}
              <span className="text-xl font-semibold tabular-nums">
                {formatMoney(selected.total)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                {
                  label: t("Opened"),
                  value: new Date(selected.createdAt).toLocaleTimeString(
                    locale,
                    { hour: "2-digit", minute: "2-digit" }
                  ),
                },
                {
                  label: t("Dining"),
                  value: t(diningLabel(selected.diningType)),
                },
                {
                  label: t("Payment"),
                  value: selected.payment
                    ? t(paymentLabels[selected.payment.method])
                    : t("Unpaid"),
                },
                ...(selected.tip > 0
                  ? [{ label: t("Tip"), value: formatMoney(selected.tip) }]
                  : []),
              ].map((field) => (
                <div key={field.label}>
                  <dt className="text-xs text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-1 font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="divide-y divide-dashed divide-border">
              {selected.items.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="text-sm font-semibold">
                    {item.quantity}× {item.name}
                  </p>
                  {item.modifiers.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.modifiers
                        .map((modifier) => modifier.name)
                        .join(" · ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-1 text-sm text-destructive">
                      {item.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {selected.notes && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="mb-1 font-semibold">{t("Order notes")}</p>
                <p>{selected.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <ContentState
            icon={<ReceiptIcon />}
            title="This order is no longer active"
            description="It may have been completed or cancelled. Check order history for its latest details."
          />
        )}
      </MobileSheet>
    </div>
  )
}
