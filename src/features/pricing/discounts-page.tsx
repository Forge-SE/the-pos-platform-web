import { useMutation, useQuery } from "@apollo/client/react"
import { PlusIcon } from "@phosphor-icons/react"
import { Navigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState, ErrorState } from "@/components/content-state"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
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
import { useTablePagination } from "@/lib/table-state"

export function DiscountsPage() {
  const { t } = useLanguage()
  const profile = getAccessTokenProfile()
  const canManage = profile?.role === "MANAGER" || profile?.role === "OWNER"
  const { data, loading, error, refetch } = useQuery<{
    discountCampaigns: Campaign[]
  }>(DISCOUNTS_QUERY, { skip: !canManage })
  const [setDiscountStatus] = useMutation(SET_DISCOUNT_STATUS)
  const [newDiscount, setNewDiscount] = useUrlState("newDiscount")
  const [search, setSearch] = useUrlState("discountSearch")
  const paging = useTablePagination("discounts")
  const campaigns = data?.discountCampaigns ?? []
  const filtered = campaigns.filter((campaign) =>
    `${campaign.name} ${campaign.code ?? ""} ${campaign.status}`
      .toLowerCase()
      .includes((search ?? "").toLowerCase().trim())
  )
  const visible = filtered.slice(
    paging.windowStart(),
    (paging.pageIndex + 1) * paging.pageSize
  )

  if (!canManage) return <Navigate to="/overview" replace />

  return (
    <div className="content-page mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            {t("Discounts")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "Create a draft, reveal the ticket, then activate it for the cashier."
            )}
          </p>
        </header>
        <Button onClick={() => setNewDiscount("1")}>
          <PlusIcon data-icon="inline-start" />
          {t("Create discount")}
        </Button>
      </div>

      <section className="content-region mt-8 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {error ? (
          <ErrorState
            title="Discounts could not be loaded."
            onRetry={refetch}
          />
        ) : !loading && campaigns.length === 0 ? (
          <EmptyState
            title="No discounts yet."
            description="Create a discount to print the first ticket."
            action={
              <Button size="lg" onClick={() => setNewDiscount("1")}>
                {t("Create discount")}
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-md bg-card lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <DataTable
              mobileFeedMode="window"
              ariaLabel="Discounts"
              mobileFieldRoles={[
                "identity",
                "meta",
                "amount",
                "detail",
                "detail",
                "status",
                "actions",
              ]}
              rows={visible}
              search={{
                value: search ?? "",
                onChange: (value) => {
                  setSearch(value || null)
                  paging.resetPage()
                },
                placeholder: "Search discounts",
              }}
              onRefresh={() => void refetch()}
              isLoading={loading}
              pagination={{ ...paging, totalCount: filtered.length }}
            >
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs tracking-[0.06em] text-muted-foreground uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("Name")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("Schedule")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("Value")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("Code")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("Uses")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("Status")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    {t("Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        title="No discounts match your search."
                        description="Try a different name or code."
                      />
                    </td>
                  </tr>
                )}
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
                  : visible.map((campaign) => (
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
                          <StatusBadge
                            tone={
                              campaign.status === "ACTIVE"
                                ? "success"
                                : campaign.status === "PAUSED"
                                  ? "destructive"
                                  : "neutral"
                            }
                          >
                            {campaign.status === "ACTIVE"
                              ? "Active"
                              : campaign.status === "PAUSED"
                                ? "Paused"
                                : statusLabels[campaign.status]}
                          </StatusBadge>
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
            </DataTable>
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
