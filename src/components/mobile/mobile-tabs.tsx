import { useId } from "react"
import { LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { useLanguage } from "@/components/language-provider"
import {
  mobileSpring,
  mobileInstant,
} from "@/components/layout/mobile/mobile-motion"

export function MobileTabs({
  items,
  value,
  onChange,
  label,
}: {
  items: ReadonlyArray<{ id: string; label: string }>
  value: string
  onChange: (id: string) => void
  label: string
}) {
  const { t } = useLanguage()
  const id = useId()
  const reduced = useReducedMotion()
  return (
    <LayoutGroup id={id}>
      <div
        role="group"
        aria-label={t(label)}
        className="mobile-segmented-control flex gap-1 overflow-x-auto rounded-xl bg-muted p-1"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
            className={`relative isolate min-h-11 flex-1 shrink-0 rounded-lg px-3 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-ring ${value === item.id ? "text-foreground" : "text-muted-foreground"}`}
          >
            {value === item.id && (
              <motion.span
                aria-hidden
                layoutId={reduced ? undefined : "selected"}
                className="absolute inset-0 -z-10 rounded-lg bg-card shadow-xs"
                transition={reduced ? mobileInstant : mobileSpring}
              />
            )}
            {t(item.label)}
          </button>
        ))}
      </div>
    </LayoutGroup>
  )
}
