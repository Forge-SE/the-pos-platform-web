import type { Icon } from "@phosphor-icons/react"

export function MetricCard({
  icon: IconComponent,
  label,
  value,
}: {
  icon: Icon
  label: string
  value: string
}) {
  return (
    <article className="flex min-h-32 min-w-0 flex-col justify-between rounded-lg border border-border/70 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-secondary">
          <IconComponent aria-hidden="true" className="size-[18px]" />
        </span>
      </div>
      <p className="mt-5 truncate text-2xl font-semibold tracking-[-0.03em] tabular-nums sm:text-3xl">
        {value}
      </p>
    </article>
  )
}
