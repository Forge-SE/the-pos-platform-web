import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Link } from "@tanstack/react-router"

import { getAccessTokenProfile } from "@/lib/auth-token"

const SHIFT_BANNER_QUERY = gql`
  query ShiftBanner {
    currentShift {
      id
    }
  }
`

export function ShiftBanner() {
  const profile = getAccessTokenProfile()
  const opensShift = profile?.role === "CASHIER" || profile?.role === "KITCHEN"
  const { data, loading } = useQuery<{ currentShift: { id: string } | null }>(
    SHIFT_BANNER_QUERY,
    { pollInterval: 30_000 }
  )
  if (loading || data?.currentShift) return null

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
