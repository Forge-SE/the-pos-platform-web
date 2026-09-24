import { useQuery } from "@apollo/client/react"
import { WarningCircleIcon } from "@phosphor-icons/react"

import { isSameDay } from "date-fns"

import { DateRangePicker, defaultPresets } from "@/components/date-range-picker"
import type { DateRange } from "@/components/date-range-picker"
import { SectionPage } from "@/components/layout/section-page"
import { Button } from "@/components/ui/button"
import {
  HeroStats,
  PaymentSplitCard,
  RosterCard,
  ShiftProgressCard,
} from "@/features/performance/live"
import { PERFORMANCE_QUERY, STAFF_ROSTER_QUERY } from "@/features/performance/model"
import type {
  PerformanceData,
  StaffRosterData,
} from "@/features/performance/model"
import {
  BestSellersCard,
  CategoryCard,
  DiscountVoidCard,
  HeatmapCard,
  RepeatRateCard,
  SalesTrendCard,
  StaffLeaderboardCard,
  TaxCard,
  VarianceCard,
} from "@/features/performance/preview"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { useUrlState } from "@/lib/url-state"

type PerfTab = "all" | "revenue" | "orders" | "staff"

const TABS: Array<{ id: PerfTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "revenue", label: "Revenue" },
  { id: "orders", label: "Orders" },
  { id: "staff", label: "Staff" },
]

function isTab(value: string | null): value is PerfTab {
  return value === "all" || value === "revenue" || value === "orders" || value === "staff"
}

function ComingSoonNote() {
  return (
    <p className="mt-4 text-xs text-muted-foreground">
      Placeholder visuals on synthetic sample data — needs backend work
      before going live.
    </p>
  )
}

export function Performance() {
  const profile = getAccessTokenProfile()
  const canSeeSales =
    profile?.role === "MANAGER" || profile?.role === "OWNER"
  const [tabParam, setTabParam] = useUrlState("perfTab")
  const tab: PerfTab = isTab(tabParam) ? tabParam : "all"
  const [rangeParam, setRangeParam] = useUrlState("range")
  const [fromParam, setFromParam] = useUrlState("from")
  const [toParam, setToParam] = useUrlState("to")
  const presets = defaultPresets()
  const range: DateRange | undefined =
    rangeParam === "custom" && fromParam
      ? { from: new Date(fromParam), to: toParam ? new Date(toParam) : undefined }
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
        from != null && to != null && nextTo != null &&
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
      setFromParam(next.from.toISOString())
      setToParam(next.to ? next.to.toISOString() : null)
    }
  }
  const { data, loading, error, refetch } = useQuery<PerformanceData>(
    PERFORMANCE_QUERY,
    { pollInterval: 60_000 }
  )
  const { data: staffData, loading: staffLoading } =
    useQuery<StaffRosterData>(STAFF_ROSTER_QUERY, { skip: !canSeeSales })

  const salesProps = {
    sales: data?.salesToday,
    salesLoading: loading || !data,
    canSeeSales,
  }

  return (
    <SectionPage
      title="Performance"
      description="Live sales and operations, plus a preview of deeper analytics."
    >
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Analytics categories"
          className="grid grid-cols-4 gap-1 rounded-lg bg-muted/50 p-1 sm:max-w-md"
        >
          {TABS.map((entry) => {
            const selected = entry.id === tab
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTabParam(entry.id === "all" ? null : entry.id)}
                className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                  selected
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {entry.label}
              </button>
            )
          })}
        </div>
        <DateRangePicker value={range} onChange={handleRangeChange} />
      </div>

      {error ? (
        <div className="mt-8 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="font-semibold text-destructive">
            Could not load performance data
          </p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-8">
          {(tab === "all" || tab === "revenue" || tab === "orders") && (
            <HeroStats {...salesProps} />
          )}

          {tab === "all" && (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <PaymentSplitCard {...salesProps} />
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
              <SalesTrendCard />
            </div>
          )}

          {tab === "orders" && (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ShiftProgressCard
                shift={data?.currentShift ?? null}
                orders={data?.activeOrders ?? []}
              />
              <BestSellersCard />
            </div>
          )}

          {tab === "staff" && canSeeSales && (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <RosterCard staff={staffData?.staff} staffLoading={staffLoading} />
              <StaffLeaderboardCard />
            </div>
          )}

          {tab === "all" && (
            <div className="mt-10">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-[-0.025em]">
                  Coming soon
                </h2>
              </div>
              <ComingSoonNote />
              {!canSeeSales && (
                <p className="mt-2 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
                  Full analytics will be manager and owner only, like live
                  sales figures.
                </p>
              )}
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <SalesTrendCard />
                <BestSellersCard />
                <HeatmapCard />
                <CategoryCard />
                <DiscountVoidCard />
                <VarianceCard />
                <StaffLeaderboardCard />
                <RepeatRateCard />
                <TaxCard />
              </div>
            </div>
          )}

          {tab === "revenue" && (
            <div className="mt-10">
              <ComingSoonNote />
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <CategoryCard />
                <DiscountVoidCard />
                <TaxCard />
                <VarianceCard />
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div className="mt-10">
              <ComingSoonNote />
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <HeatmapCard />
                <RepeatRateCard />
              </div>
            </div>
          )}

          {tab === "staff" && !canSeeSales && (
            <div className="mt-10">
              <ComingSoonNote />
              <p className="mt-2 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
                Staff analytics will be manager and owner only.
              </p>
            </div>
          )}
        </div>
      )}
    </SectionPage>
  )
}
