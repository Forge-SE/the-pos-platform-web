import type { ReactNode } from "react"
import { cn } from "cn"
import { useLanguage } from "@/components/language-provider"

const tones = {
  success: "bg-success text-success-foreground",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info text-info-foreground",
  progress: "bg-progress text-progress-foreground",
  warning: "bg-warning text-warning-foreground",
} as const

export type StatusTone = keyof typeof tones

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: StatusTone
  className?: string
}) {
  const { t } = useLanguage()
  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] leading-none font-medium whitespace-nowrap uppercase",
        tones[tone],
        className
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {typeof children === "string" ? t(children) : children}
    </span>
  )
}
