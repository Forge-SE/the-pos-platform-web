import { formatPreparationTime } from "@/lib/preparation-time"
import { ClockIcon } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"

export function MealPreparationTime({
  minutes,
  showUnset = false,
}: {
  minutes: number | null | undefined
  showUnset?: boolean
}) {
  const label = formatPreparationTime(minutes)
  if (label == null && !showUnset) return null
  return (
    <Badge
      variant="outline"
      className="mt-2 bg-muted/40 text-muted-foreground tabular-nums"
      aria-label={
        label == null
          ? "Preparation time not set"
          : `Usual preparation time: ${label}`
      }
    >
      <ClockIcon aria-hidden="true" />
      {label ?? "Prep time not set"}
    </Badge>
  )
}
