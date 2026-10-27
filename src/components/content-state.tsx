import { useState } from "react"
import type { ReactNode } from "react"
import { cn } from "cn"
import { TrayIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

export function ContentState({
  icon,
  title,
  description,
  action,
  error = false,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  error?: boolean
  className?: string
}) {
  const { t } = useLanguage()
  const resolvedAction =
    action === undefined ? (
      <Button
        variant="outline"
        size="lg"
        onClick={() => window.location.reload()}
      >
        {t("Check again")}
      </Button>
    ) : (
      action
    )
  return (
    <div
      data-content-state={error ? "error" : "empty"}
      role={error ? "alert" : "status"}
      className={cn(
        "flex min-h-80 w-full flex-1 flex-col items-center justify-center px-6 py-12 text-center",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mb-5 flex size-14 items-center justify-center rounded-full [&_svg]:size-7",
          error
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground"
        )}
      >
        {icon ?? (error ? <WarningCircleIcon /> : <TrayIcon />)}
      </span>
      <p className="max-w-sm text-base font-semibold text-balance text-foreground">
        {t(title)}
      </p>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-pretty text-muted-foreground">
          {t(description)}
        </p>
      )}
      {resolvedAction && (
        <div className="mt-6 flex justify-center">{resolvedAction}</div>
      )}
    </div>
  )
}

export function EmptyState(
  props: Omit<Parameters<typeof ContentState>[0], "error">
) {
  return <ContentState {...props} />
}

export function ErrorState({
  onRetry,
  description = "Try again to load the latest data.",
  ...props
}: Omit<Parameters<typeof ContentState>[0], "error" | "action"> & {
  onRetry: () => unknown
}) {
  const { t } = useLanguage()
  const [retrying, setRetrying] = useState(false)
  async function retry() {
    if (retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } catch {
      // The owning query keeps its error visible; rejected retries are handled.
    } finally {
      setRetrying(false)
    }
  }
  return (
    <ContentState
      {...props}
      error
      description={description}
      action={
        <Button
          variant="outline"
          size="lg"
          disabled={retrying}
          onClick={() => void retry()}
        >
          {t(retrying ? "Trying again…" : "Try again")}
        </Button>
      }
    />
  )
}
