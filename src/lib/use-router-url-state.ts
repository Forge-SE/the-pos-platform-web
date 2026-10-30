import { useEffect } from "react"
import { useLocation, useRouter } from "@tanstack/react-router"
import { notifyUrlStateChange } from "./url-state"

/** Keep URL-backed POS controls in sync with router links as well as Back/Forward. */
export function useRouterUrlState() {
  const href = useLocation({ select: (location) => location.href })
  const router = useRouter()
  useEffect(() => {
    // Browser history batches writes; URL-backed controls read the actual URL.
    router.history.flush()
    notifyUrlStateChange()
  }, [href, router])
}
