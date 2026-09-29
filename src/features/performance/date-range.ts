import { format, isValid, parseISO } from "date-fns"
import type { DateRange } from "react-day-picker"

export function resolveCustomRange(
  from: string | null,
  to: string | null,
  fallback: DateRange
): DateRange {
  if (!from) return fallback
  const start = parseISO(from)
  const end = to ? parseISO(to) : start
  if (!isValid(start) || !isValid(end) || start > end) return fallback
  return { from: start, to: end }
}

export function salesRangeVariables(range: DateRange) {
  if (!range.from) throw new Error("A sales range needs a start date")
  return {
    from: format(range.from, "yyyy-MM-dd"),
    to: format(range.to ?? range.from, "yyyy-MM-dd"),
  }
}
