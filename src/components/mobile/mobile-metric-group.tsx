import { useRef } from "react"
import type { Icon } from "@phosphor-icons/react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import styles from "./mobile-content.module.css"

export interface MobileMetric {
  id: string
  label: string
  value: string
  icon?: Icon
}

/** Summary keeps important metrics visible. Swipe is opt-in for secondary collections. */
export function MobileMetricGroup({
  items,
  label,
  layout = "summary",
  busy = false,
}: {
  items: MobileMetric[]
  label: string
  layout?: "summary" | "swipe"
  busy?: boolean
}) {
  const rail = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()
  const move = (direction: number) => {
    const element = rail.current
    if (!element) return
    element.scrollBy({
      left: direction * element.clientWidth * 0.86,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    })
  }
  return (
    <section aria-label={label} aria-busy={busy}>
      {layout === "swipe" && (
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{label}</h2>
          <div className="flex gap-1">
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label={t("Previous cards")}
              onClick={() => move(-1)}
            >
              <CaretLeftIcon aria-hidden />
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label={t("Next cards")}
              onClick={() => move(1)}
            >
              <CaretRightIcon aria-hidden />
            </Button>
          </div>
        </div>
      )}
      <div
        ref={rail}
        className={
          layout === "swipe" ? styles.metricRail : styles.metricSummary
        }
        tabIndex={layout === "swipe" ? 0 : undefined}
        role="list"
        aria-label={label}
      >
        {items.map(
          ({ id, label: metricLabel, value, icon: IconComponent }, index) => (
            <div
              key={id}
              role="listitem"
              className={styles.metric}
              data-leading={index === 0 && layout === "summary"}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {metricLabel}
                </p>
                {IconComponent && (
                  <IconComponent
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
              <p className={styles.metricValue}>{value}</p>
            </div>
          )
        )}
      </div>
    </section>
  )
}
