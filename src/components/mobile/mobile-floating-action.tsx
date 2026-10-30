import type { Icon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useMobileKeyboard } from "@/lib/use-mobile-keyboard"

/** A single optional action, positioned above the floating bottom navigation. */
export function MobileFloatingAction({
  label,
  icon: IconComponent,
  onClick,
  expanded,
}: {
  label: string
  icon: Icon
  onClick: () => void
  expanded?: boolean
}) {
  const keyboardOpen = useMobileKeyboard()
  return (
    <Button
      size="icon-lg"
      aria-label={label}
      aria-haspopup={expanded === undefined ? undefined : "dialog"}
      aria-expanded={expanded}
      hidden={keyboardOpen}
      onClick={onClick}
      className="fixed right-[calc(1rem+env(safe-area-inset-right,0px))] bottom-[calc(var(--mobile-nav-clearance)+0.5rem)] z-30 size-14 rounded-full shadow-lg lg:hidden"
    >
      <IconComponent aria-hidden className="size-6" />
    </Button>
  )
}
