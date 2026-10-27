import { useQuery } from "@apollo/client/react"

import { format, isSameDay } from "date-fns"

import { DateRangePicker, defaultPresets } from "@/components/date-range-picker"
import type { DateRange } from "@/components/date-range-picker"
import { SectionPage } from "@/components/layout/section-page"
import { ErrorState } from "@/components/content-state"
import { useLanguage } from "@/components/language-provider"
import {
  HeroStats,
  PaymentSplitCard,
  RosterCard,
  ShiftProgressCard,
} from "@/features/performance/live"
import {
  PERFORMANCE_QUERY,
  STAFF_ROSTER_QUERY,
} from "@/features/performance/model"
import type {
  PerformanceData,
  StaffRosterData,
} from "@/features/performance/model"
import { AnalyticsCards } from "@/features/performance/analytics"
import { AccountantExport } from "@/features/performance/accountant-export"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"
import { useUrlState } from "@/lib/url-state"
import { resolveCustomRange, salesRangeVariables } from "./date-range"

type PerfTab = "all" | "revenue" | "orders" | "staff"

const TABS: Array<{ id: PerfTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "revenue", label: "Revenue" },
  { id: "orders", label: "Orders" },
  { id: "staff", label: "Staff" },
]

function isTab(value: string | null): value is PerfTab {
  return (
    value === "all" ||
    value === "revenue" ||
    value === "orders" ||
    value === "staff"
  )
}

export function Performance() {
  const { t } = useLanguage()
  const profile = getAccessTokenProfile()
  const canSeeSales = hasPermission(profile, "REPORTS_VIEW")
  const tabs = TABS.filter(
    (entry) => canSeeSales || (entry.id !== "revenue" && entry.id !== "staff")
  )
  const [tabParam, setTabParam] = useUrlState("perfTab")
  const tab: PerfTab =
    isTab(tabParam) && tabs.some((entry) => entry.id === tabParam)
      ? tabParam
      : "all"
  const [rangeParam, setRangeParam] = useUrlState("range")
  const [fromParam, setFromParam] = useUrlState("from")
  const [toParam, setToParam] = useUrlState("to")
  const presets = defaultPresets()
  const range: DateRange =
    rangeParam === "custom" && fromParam
      ? resolveCustomRange(fromParam, toParam, presets[2].dateRange)
      : (presets.find((preset) => preset.id === (rangeParam ?? "30d"))
          ?.dateRange ?? presets[2].dateRange)
  function handleRangeChange(next: DateRange | undefined) {
    if (!next?.from) {
      setRangeParam(null)
      setFromParam(null)
      setToParam(null)
      return
    }
    const nextFrom = next.from
    const nextTo = next.to
    const match = presets.find((preset) => {
      const from = preset.dateRange.from
      const to = preset.dateRange.to
      return (
        from != null &&
        to != null &&
        nextTo != null &&
        isSameDay(nextFrom, from) &&
        isSameDay(nextTo, to)
      )
    })
    if (match) {
      setRangeParam(match.id)
      setFromParam(null)
      setToParam(null)
    } else {
      setRangeParam("custom")
      setFromParam(format(next.from, "yyyy-MM-dd"))
      setToParam(format(next.to ?? next.from, "yyyy-MM-dd"))
    }
  }
  const { data, loading, error, refetch } = useQuery<PerformanceData>(
    PERFORMANCE_QUERY,
    {
      variables: { ...salesRangeVariables(range), includeSales: canSeeSales },
      pollInterval: 60_000,
      notifyOnNetworkStatusChange: true,
    }
  )
  const { data: staffData, loading: staffLoading } = useQuery<StaffRosterData>(
    STAFF_ROSTER_QUERY,
    { skip: !canSeeSales }
  )

  const salesProps = {
    sales: data?.salesSummary,
    salesLoading: loading || !data,
    periodLabel: range.from
      ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to ?? range.from, "MMM d, yyyy")}`
      : "Selected period",
  }

  return (
    <SectionPage
      title="Performance"
      description="Sales and operations for the selected dates, updated every minute."
    >
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label={t("Analytics categories")}
          className={`grid gap-1 rounded-lg bg-muted/50 p-1 sm:max-w-md ${tabs.length === 4 ? "grid-cols-4" : "grid-cols-2"}`}
        >
          {tabs.map((entry) => {
            const selected = entry.id === tab
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() =>
                  setTabParam(entry.id === "all" ? null : entry.id)
                }
                className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                  selected
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(entry.label)}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={range} onChange={handleRangeChange} />
          {canSeeSales && range.from && (
            <AccountantExport
              from={format(range.from, "yyyy-MM-dd")}
              to={format(range.to ?? range.from, "yyyy-MM-dd")}
            />
          )}
        </div>
      </div>
      {error ? (
        <ErrorState title="Could not load performance data" onRetry={refetch} />
      ) : (
        <div className="mt-8">
          {canSeeSales &&
            (tab === "all" || tab === "revenue" || tab === "orders") && (
              <HeroStats {...salesProps} />
            )}

          {tab === "all" && (
            <div
              className={`mt-4 grid gap-4 ${canSeeSales ? "xl:grid-cols-2" : ""}`}
            >
              {canSeeSales && <PaymentSplitCard {...salesProps} />}
              <div className="grid content-start gap-4">
                <ShiftProgressCard
                  shift={data?.currentShift ?? null}
                  orders={data?.activeOrders ?? []}
                />
                {canSeeSales && (
                  <RosterCard
                    staff={staffData?.staff}
                    staffLoading={staffLoading}
                  />
                )}
              </div>
            </div>
          )}

          {tab === "revenue" && (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <PaymentSplitCard {...salesProps} />
            </div>
          )}

          {tab === "orders" && (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ShiftProgressCard
                shift={data?.currentShift ?? null}
                orders={data?.activeOrders ?? []}
              />
            </div>
          )}

          {tab === "staff" && canSeeSales && (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <RosterCard
                staff={staffData?.staff}
                staffLoading={staffLoading}
              />
            </div>
          )}

          {canSeeSales && (
            <AnalyticsCards
              operations={data?.operationsSummary}
              sales={data?.salesSummary}
              loading={loading}
              tab={tab}
            />
          )}
        </div>
      )}
    </SectionPage>
  )
}
