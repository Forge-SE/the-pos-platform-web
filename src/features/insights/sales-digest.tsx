import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"

import { Button } from "@/components/ui/button"
import { formatMoney } from "@/features/menu/model"
import { hasPermission } from "@/lib/permissions"
import { getAccessTokenProfile } from "@/lib/auth-token"

const DIGEST_QUERY = gql`
  query SalesDigestCard {
    salesDigest {
      businessDate
      netSales
      orders
      averageOrderValue
      previousNetSales
      cash
      momo
      transfer
      voids
      discounts
      recommendation
      topItems {
        name
        netSales
        quantity
      }
      recipient
      lastEmailedAt
    }
  }
`

const SEND_DIGEST = gql`
  mutation EmailSalesDigest {
    sendSalesDigest {
      status
      recipient
      businessDate
    }
  }
`

export function SalesDigestCard() {
  const profile = getAccessTokenProfile()
  const allowed = Boolean(profile && hasPermission(profile, "REPORTS_VIEW"))
  const { data, loading, refetch } = useQuery<{
    salesDigest: {
      businessDate: string
      netSales: number
      orders: number
      averageOrderValue: number
      previousNetSales: number
      cash: number
      momo: number
      transfer: number
      voids: number
      discounts: number
      recommendation: string
      topItems: Array<{ name: string; netSales: number; quantity: number }>
      recipient: string | null
      lastEmailedAt: string | null
    }
  }>(DIGEST_QUERY, { skip: !allowed })
  const [send, { loading: sending, data: sent, error: sendError }] =
    useMutation<{
      sendSalesDigest: {
        status: string
        recipient: string | null
        businessDate: string
      }
    }>(SEND_DIGEST)
  if (!allowed) return null
  const digest = data?.salesDigest
  return (
    <section className="relative mt-6 overflow-hidden rounded-xl bg-secondary p-5 text-secondary-foreground sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_center,currentColor_1px,transparent_1px)] [mask-image:linear-gradient(90deg,transparent_25%,black_100%)] [background-size:18px_18px] opacity-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 right-16 size-56 rounded-full border border-current/20"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase opacity-70">
            Sales digest
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] tabular-nums sm:text-2xl">
            {loading || !digest
              ? "Preparing today's snapshot"
              : `${formatMoney(digest.netSales)} net sales`}
          </h2>
          {digest && (
            <p className="mt-1 text-sm opacity-75">
              {digest.orders} {digest.orders === 1 ? "order" : "orders"} today
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          disabled={sending}
          onClick={() => {
            void send()
              .then(() => refetch())
              .catch(() => undefined)
          }}
          className="shrink-0 self-start sm:self-center"
        >
          {sending ? "Sending…" : "Email yesterday's digest"}
        </Button>
      </div>
      {sendError && (
        <p role="alert" className="relative mt-3 text-sm">
          The digest could not be emailed. Please try again.
        </p>
      )}
      {sent?.sendSalesDigest && (
        <p role="status" className="relative mt-3 text-sm opacity-80">
          {sent.sendSalesDigest.status === "sent"
            ? "Digest emailed."
            : sent.sendSalesDigest.status === "logged"
              ? "Digest prepared; email delivery is not configured."
              : "Digest email is unavailable. Check the recipient in settings."}
        </p>
      )}
    </section>
  )
}
