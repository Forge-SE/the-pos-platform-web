import { OvaalMark } from "@/components/ovaal-mark"
import { useLanguage } from "@/components/language-provider"

export function LoadingState({
  label,
  className = "",
}: {
  label: string
  className?: string
}) {
  const { language } = useLanguage()
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-40 w-full flex-col items-center justify-center gap-3 py-8 text-center font-brand ${className}`}
    >
      <span className="relative flex size-14 items-center justify-center rounded-full text-primary">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary motion-reduce:animate-none" />
        <OvaalMark elevated={false} />
      </span>
      <span className="text-sm font-medium text-muted-foreground">
        {language === "fr" ? "Chargement…" : `Loading ${label}…`}
      </span>
    </div>
  )
}
