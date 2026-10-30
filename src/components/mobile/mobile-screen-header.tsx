import type { ReactNode } from "react"

/** Compact screen identity; callers own navigation, data and action permissions. */
export function MobileScreenHeader({
  title,
  subtitle,
  leading,
  actions,
}: {
  title: string
  subtitle?: string
  leading?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mobile-app-header sticky z-30 bg-card/95 backdrop-blur-xl lg:hidden">
      <div className="flex min-h-16 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <div className="min-w-0">
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {title}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </header>
  )
}
