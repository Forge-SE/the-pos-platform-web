import { formatPreparationTime } from "@/lib/preparation-time"
import { ClockIcon } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"

export function MealPreparationTime({
  minutes,
  showUnset = false,
  appearance = "muted",
}: {
  minutes: number | null | undefined
  showUnset?: boolean
  appearance?: "muted" | "lime"
}) {
  const label = formatPreparationTime(minutes)
  if (label == null && !showUnset) return null
  return (
    <Badge
      variant="outline"
      className={
        appearance === "lime"
          ? "shrink-0 border-transparent bg-primary text-primary-foreground tabular-nums"
          : "mt-2 bg-muted/40 text-muted-foreground tabular-nums"
      }
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
