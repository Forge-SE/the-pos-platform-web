"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { format, isSameDay, subDays, subMonths } from "date-fns"
import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  XIcon,
} from "@phosphor-icons/react"
import { DayPicker } from "react-day-picker"
import type { DateRange } from "react-day-picker"
import "react-day-picker/style.css"

import { Button } from "@/components/ui/button"

export type { DateRange }

export interface RangePreset {
  id: string
  label: string
  dateRange: DateRange
}

export function defaultPresets(): RangePreset[] {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  return [
    { id: "today", label: "Today", dateRange: { from: now, to: now } },
    {
      id: "7d",
      label: "Last 7 days",
      dateRange: { from: subDays(now, 7), to: now },
    },
    {
      id: "30d",
      label: "Last 30 days",
      dateRange: { from: subDays(now, 30), to: now },
    },
    {
      id: "mtd",
      label: "Month to date",
      dateRange: { from: startOfMonth, to: now },
    },
    {
      id: "ytd",
      label: "Year to date",
      dateRange: { from: startOfYear, to: now },
    },
    {
      id: "3m",
      label: "Last 3 months",
      dateRange: { from: subMonths(now, 3), to: now },
    },
    {
      id: "12m",
      label: "Last 12 months",
      dateRange: { from: subMonths(now, 12), to: now },
    },
  ]
}

export function formatRange(range: DateRange | undefined) {
  if (!range?.from) return null
  const from = format(range.from, "LLL dd, y")
  return range.to ? `${from} - ${format(range.to, "LLL dd, y")}` : from
}

function rangesEqual(a: DateRange | undefined, b: DateRange | undefined) {
  return (
    a?.from != null &&
    b?.from != null &&
    a.to != null &&
    b.to != null &&
    isSameDay(a.from, b.from) &&
    isSameDay(a.to, b.to)
  )
}

function PresetButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 w-full shrink-0 rounded-md px-3 text-left text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:whitespace-normal ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Date range filter modeled on the reports filter: preset shortcuts,
 * a range calendar, and an explicit Cancel/Apply step so partially
 * picked ranges never leak into queries.
 */
export function DateRangePicker({
  value,
  onChange,
  presets = defaultPresets(),
  label = "Filter by date range",
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  presets?: RangePreset[]
  label?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>(value)
  const [month, setMonth] = React.useState<Date | undefined>(value?.from)

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  React.useEffect(() => {
    if (draft?.from) setMonth(draft.from)
  }, [draft])

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value)
      setMonth(value?.from)
    }
    setOpen(next)
  }

  function apply() {
    onChange(draft)
    setOpen(false)
  }

  const display = formatRange(value)

  return (
    <div className="flex items-center gap-2">
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          render={
            <Button
              variant="outline"
              aria-label={label}
              title={display ?? label}
            >
              <CalendarBlankIcon data-icon="inline-start" />
              {display ?? "Select a range"}
            </Button>
          }
        />
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="end"
            sideOffset={8}
            className="z-50 outline-none"
          >
            <Popover.Popup className="w-[min(560px,calc(100vw-2rem))] origin-[var(--transform-origin)] rounded-xl border border-border/70 bg-card text-card-foreground shadow-lg transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none">
              <div className="flex flex-col sm:flex-row">
                <div className="border-b border-border/60 px-3 py-4 sm:w-44 sm:shrink-0 sm:border-r sm:border-b-0">
                  <div className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
                    {presets.map((preset) => (
                      <PresetButton
                        key={preset.id}
                        active={rangesEqual(draft, preset.dateRange)}
                        onClick={() => setDraft(preset.dateRange)}
                      >
                        {preset.label}
                      </PresetButton>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 flex-1 p-4">
                  <DayPicker
                    mode="range"
                    month={month}
                    onMonthChange={setMonth}
                    selected={draft}
                    onSelect={setDraft}
                    numberOfMonths={1}
                    showOutsideDays={false}
                    classNames={{
                      months: "flex w-full justify-center",
                      month_caption:
                        "flex items-center justify-between px-1 pb-3 text-sm font-semibold",
                      button_previous:
                        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                      button_next:
                        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                      chevron: "hidden",
                      month_grid: "w-full border-collapse",
                      weekdays: "flex",
                      weekday:
                        "flex size-9 flex-1 items-center justify-center text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase",
                      week: "flex w-full",
                      day: "flex flex-1 items-center justify-center p-0.5",
                      day_button:
                        "flex size-9 w-full items-center justify-center rounded-md text-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 aria-selected:bg-secondary aria-selected:text-secondary-foreground",
                    }}
                    components={{
                      Chevron: ({ orientation }) =>
                        orientation === "left" ? (
                          <CaretLeftIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                        ) : (
                          <CaretRightIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                        ),
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium" aria-live="polite">
                  {formatRange(draft) ?? "Select a range"}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={apply} disabled={!draft?.from}>
                    Apply
                  </Button>
                </div>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {value?.from && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Clear date filter"
          title="Clear date filter"
          onClick={() => onChange(undefined)}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
