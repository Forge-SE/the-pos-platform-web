import { ChartDonutIcon } from "@phosphor-icons/react"

export function OvaalMark({ elevated = true }: { elevated?: boolean }) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground ${elevated ? "shadow-sm" : ""}`}
    >
      <ChartDonutIcon aria-hidden="true" className="size-5" weight="bold" />
    </span>
  )
}
