import { useQuery } from "@apollo/client/react"
import { Link } from "@tanstack/react-router"

import { getAccessTokenProfile } from "@/lib/auth-token"
import { CURRENT_SHIFT_QUERY } from "@/features/shifts/current-shift"
import { POLL_INTERVAL } from "@/lib/polling"

export function ShiftBanner() {
  const profile = getAccessTokenProfile()
  const opensShift = profile?.role === "CASHIER" || profile?.role === "KITCHEN"
  const { data } = useQuery<{ currentShift: { id: string } | null }>(
    CURRENT_SHIFT_QUERY,
    {
      // The only poller of the open shift: other screens read it from the cache.
      pollInterval: POLL_INTERVAL.STATUS,
      notifyOnNetworkStatusChange: false,
    }
  )
  // Keep the last confirmed shift state while polling or recovering from errors.
  if (!data || data.currentShift) return null

  return (
    <div className="sticky top-0 z-40 bg-secondary px-4 py-2.5 text-center text-sm text-secondary-foreground">
      No shift is open.
      {opensShift && (
        <>
          {" "}
          <Link
            to="/shift"
            className="font-semibold underline underline-offset-4"
          >
            Open the register
          </Link>{" "}
          before taking orders.
        </>
      )}
    </div>
  )
}
