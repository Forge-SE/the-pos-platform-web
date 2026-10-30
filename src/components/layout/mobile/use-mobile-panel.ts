import { useRef } from "react"
import { useUrlState } from "@/lib/url-state"

/** A history entry lets the device Back action dismiss a mobile sheet first. */
export function useMobilePanel(kind: string) {
  const [panel, pushPanel] = useUrlState("mobilePanel", "push")
  const [, replacePanel] = useUrlState("mobilePanel")
  const openedHere = useRef(false)
  const dismissForNavigation = () => {
    openedHere.current = false
    replacePanel(null)
  }
  return {
    open: panel === kind,
    dismissForNavigation,
    onOpenChange: (open: boolean) => {
      if (open) {
        openedHere.current = true
        pushPanel(kind)
      } else if (openedHere.current && panel === kind) {
        openedHere.current = false
        window.history.back()
      } else {
        dismissForNavigation()
      }
    },
  }
}
