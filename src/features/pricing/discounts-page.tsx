import { useMutation, useQuery } from "@apollo/client/react"
import { PlusIcon } from "@phosphor-icons/react"
import { Navigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"
import { mutationMessage } from "@/features/menu/model"
import { CreateDiscountModal } from "@/features/pricing/modals/create-discount-modal"
import {
  campaignValue,
  DISCOUNTS_QUERY,
  scheduleLabels,
  SET_DISCOUNT_STATUS,
  statusLabels,
} from "@/features/pricing/model"
import type { Campaign } from "@/features/pricing/model"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { useUrlState } from "@/lib/url-state"

export function DiscountsPage() {
  const profile = getAccessTokenProfile()
  const canManage = profile?.role === "MANAGER" || profile?.role === "OWNER"
  const { data, loading, error, refetch } = useQuery<{
    discountCampaigns: Campaign[]
  }>(DISCOUNTS_QUERY, { skip: !canManage })
  const [setDiscountStatus] = useMutation(SET_DISCOUNT_STATUS)
  const [newDiscount, setNewDiscount] = useUrlState("newDiscount")
  const campaigns = data?.discountCampaigns ?? []

  if (!canManage) return <Navigate to="/overview" replace />

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Discounts
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a draft, reveal the ticket, then activate it for the cashier.
          </p>
        </header>
        <Button onClick={() => setNewDiscount("1")}>
          <PlusIcon data-icon="inline-start" />
          Create discount
        </Button>
      </div>

      <section className="mt-8">
        {error ? (
          <div className="rounded-lg bg-destructive/5 p-5 text-sm text-destructive">
            Discounts could not be loaded.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs tracking-[0.06em] text-muted-foreground uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Schedule
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Value
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Code
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Uses
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        {Array.from({ length: 7 }).map((__, cell) => (
                          <td key={cell} className="px-4 py-4">
                            <div className="h-4 w-16 rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : campaigns.map((campaign) => (
                      <tr
                        key={campaign.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3.5 font-medium">
                          {campaign.name}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline">
                            {scheduleLabels[campaign.scheduleType]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          {campaignValue(campaign)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs tracking-wide">
                          {campaign.code ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {campaign.usedCount}
                          {campaign.maxUses ? `/${campaign.maxUses}` : ""}
                        </td>
                        <td className="px-4 py-3.5">
                          {campaign.status === "ACTIVE" ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-primary/25 text-primary-foreground"
                            >
                              Active
                            </Badge>
                          ) : campaign.status === "PAUSED" ? (
                            <Badge variant="destructive">Paused</Badge>
                          ) : (
                            <Badge variant="outline">
                              {statusLabels[campaign.status]}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await setDiscountStatus({
                                  variables: {
                                    id: campaign.id,
                                    status:
                                      campaign.status === "ACTIVE"
                                        ? "PAUSED"
                                        : "ACTIVE",
                                  },
                                })
                                await refetch()
                              } catch (caught) {
                                toast({
                                  title: "Could not update discount",
                                  description: mutationMessage(
                                    caught,
                                    "Try again."
                                  ),
                                  status: "error",
                                })
                              }
                            }}
                          >
                            {campaign.status === "ACTIVE"
                              ? "Pause"
                              : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && campaigns.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-medium">No discounts yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use “Create discount” to print the first ticket.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <CreateDiscountModal
        open={newDiscount === "1"}
        onOpenChange={(next) => {
          if (!next) setNewDiscount(null)
        }}
        onCreated={() => {
          void refetch()
        }}
      />
    </div>
  )
}
