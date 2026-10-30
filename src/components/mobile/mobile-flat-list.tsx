import type { Key, ReactNode } from "react"
import { CaretRightIcon } from "@phosphor-icons/react"

/** A mobile alternative to tabular rows. The caller controls fields and pagination. */
export function MobileFlatList<T>({
  items,
  getKey,
  renderItem,
  label,
  empty,
}: {
  items: T[]
  getKey: (item: T) => Key
  renderItem: (item: T) => ReactNode
  label: string
  empty: ReactNode
}) {
  if (items.length === 0) return empty
  return (
    <ul aria-label={label} className="divide-y divide-border/60">
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

export function MobileRecordRow({
  title,
  subtitle,
  badge,
  amount,
  fields,
  children,
  onOpen,
  openLabel,
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  amount?: ReactNode
  fields?: Array<{ label: string; value: ReactNode }>
  children?: ReactNode
  onOpen?: () => void
  openLabel?: string
}) {
  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="block text-base font-semibold break-words">
          {title}
        </span>
        {subtitle && (
          <span className="block text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
        {children && <span className="mt-1 block text-sm">{children}</span>}
        {fields && (
          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {fields.map((field) => (
              <span key={field.label}>
                <span className="sr-only">{field.label}: </span>
                {field.value}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex max-w-[45%] shrink-0 flex-col items-end gap-2">
        <span className="text-base font-semibold break-words tabular-nums">
          {amount}
        </span>
        <span className="flex items-center gap-1">
          {badge}
          {onOpen && (
            <CaretRightIcon
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          )}
        </span>
      </span>
    </>
  )
  return onOpen ? (
    <button
      type="button"
      aria-label={openLabel}
      onClick={onOpen}
      className="flex w-full items-start gap-3 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring active:bg-muted/50"
    >
      {content}
    </button>
  ) : (
    <article className="flex items-start gap-3 py-4">{content}</article>
  )
}
