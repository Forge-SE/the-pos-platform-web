import type { DiningType } from "../onboarding-contract"

export function DiningTypeChoice({
  value,
  currentValue,
  title,
  description,
  onChange,
}: {
  value: DiningType
  currentValue: DiningType
  title: string
  description: string
  onChange: (value: DiningType) => void
}) {
  const selected = currentValue === value

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onChange(value)}
      className="group flex min-h-20 w-full items-start gap-3 rounded-lg border bg-background p-3.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] outline-none hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/5 data-[selected=true]:shadow-[0_0_0_1px_var(--primary)] motion-reduce:transition-none motion-reduce:active:scale-100"
      data-selected={selected}
    >
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-input bg-card group-data-[selected=true]:border-primary"
        aria-hidden="true"
      >
        <span className="size-2 rounded-full bg-primary opacity-0 transition-opacity duration-150 group-data-[selected=true]:opacity-100" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  )
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-foreground">
        {value}
      </dd>
    </div>
  )
}
