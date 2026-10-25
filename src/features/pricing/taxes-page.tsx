import { useMutation, useQuery } from "@apollo/client/react"
import { TaxProfileForm } from "./tax-profile-form"
import { PlusIcon, ReceiptIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { Navigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { ContentState } from "@/components/content-state"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toaster"
import { mutationMessage } from "@/features/menu/model"
import { CreateTaxModal } from "@/features/pricing/modals/create-tax-modal"
import {
  SET_TAX_ACTIVE,
  TAXES_QUERY,
  taxRateLabel,
} from "@/features/pricing/model"
import type { Tax } from "@/features/pricing/model"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { useUrlState } from "@/lib/url-state"
import { useTablePagination } from "@/lib/table-state"

export function TaxesPage() {
  const profile = getAccessTokenProfile()
  const canManage = profile?.role === "MANAGER" || profile?.role === "OWNER"
  const { data, loading, error, refetch } = useQuery<{
    restaurantTaxes: Tax[]
  }>(TAXES_QUERY, { skip: !canManage })
  const [setTaxActive] = useMutation(SET_TAX_ACTIVE)
  const [newTax, setNewTax] = useUrlState("newTax")
  const [search, setSearch] = useUrlState("taxSearch")
  const paging = useTablePagination("taxes")
  const taxes = data?.restaurantTaxes ?? []
  const filtered = taxes.filter((tax) =>
    tax.name.toLowerCase().includes((search ?? "").toLowerCase().trim())
  )
  const visible = filtered.slice(
    paging.pageIndex * paging.pageSize,
    (paging.pageIndex + 1) * paging.pageSize
  )

  if (!canManage) return <Navigate to="/overview" replace />

  return (
    <div className="content-page mx-auto flex min-h-svh w-full max-w-[1440px] flex-col px-4 py-5 sm:px-6 lg:min-h-full lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Taxes
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose your business profile. Tax is calculated automatically on new
            orders.
          </p>
        </header>
      </div>

      <section className="mt-8 rounded-xl border border-border/70 bg-card p-5 has-[[data-content-state]]:flex has-[[data-content-state]]:flex-1 has-[[data-content-state]]:flex-col has-[[data-content-state]]:border-transparent sm:p-6">
        <TaxProfileForm
          onSaved={() => {
            void refetch()
          }}
        />
      </section>
      <details className="mt-6">
        <summary className="cursor-pointer py-3 text-sm font-semibold">
          Manage custom tax rates
        </summary>
        <p className="mb-4 text-xs text-muted-foreground">
          These rates apply only when Other / custom is the saved profile. Each
          rate keeps its own included or added price setting.
        </p>
        {!error && (loading || taxes.length > 0) && (
          <Button
            variant="outline"
            className="mb-4"
            onClick={() => setNewTax("1")}
          >
            <PlusIcon data-icon="inline-start" />
            Create tax
          </Button>
        )}
        <section>
          {error ? (
            <ContentState
              error
              icon={<WarningCircleIcon />}
              title="Taxes could not be loaded."
              description="Try again to load your custom tax rates."
              action={
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => void refetch().catch(() => {})}
                >
                  Try again
                </Button>
              }
            />
          ) : !loading && taxes.length === 0 ? (
            <ContentState
              icon={<ReceiptIcon />}
              title="No custom tax rates yet."
              description="Create your first rate to use with the Other / custom profile."
              action={
                <Button size="lg" onClick={() => setNewTax("1")}>
                  <PlusIcon data-icon="inline-start" />
                  Create tax
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-md bg-card">
              <DataTable
                ariaLabel="Custom tax rates"
                rows={visible}
                search={{
                  value: search ?? "",
                  onChange: (value) => {
                    setSearch(value || null)
                    paging.resetPage()
                  },
                  placeholder: "Search tax rates",
                }}
                onRefresh={() => void refetch()}
                isLoading={loading}
                pagination={{ ...paging, totalCount: filtered.length }}
              >
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-xs tracking-[0.06em] text-muted-foreground uppercase">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Rate
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Applied
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!loading && visible.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <ContentState
                          icon={<ReceiptIcon />}
                          title="No tax rates match your search."
                          description="Try a different name."
                        />
                      </td>
                    </tr>
                  )}
                  {loading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-4 py-4">
                            <div className="h-4 w-32 rounded bg-muted" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-16 rounded bg-muted" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-28 rounded bg-muted" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-16 rounded bg-muted" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="ml-auto h-4 w-10 rounded bg-muted" />
                          </td>
                        </tr>
                      ))
                    : visible.map((tax) => (
                        <tr
                          key={tax.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3.5 font-medium">
                            {tax.name}
                          </td>
                          <td className="px-4 py-3.5">
                            {taxRateLabel(tax.rateBps)}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {tax.inclusive
                              ? "Included in prices"
                              : "Added at checkout"}
                          </td>
                          <td className="px-4 py-3.5">
                            {tax.isActive ? (
                              <Badge
                                variant="outline"
                                className="border-transparent bg-primary/25 text-primary-foreground"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Switch
                              checked={tax.isActive}
                              aria-label={`${tax.isActive ? "Disable" : "Enable"} ${tax.name}`}
                              onCheckedChange={async (active) => {
                                try {
                                  await setTaxActive({
                                    variables: { id: tax.id, active },
                                  })
                                  await refetch()
                                } catch (caught) {
                                  toast({
                                    title: "Could not update tax",
                                    description: mutationMessage(
                                      caught,
                                      "Try again."
                                    ),
                                    status: "error",
                                  })
                                }
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </section>
      </details>

      <CreateTaxModal
        open={newTax === "1"}
        onOpenChange={(next) => {
          if (!next) setNewTax(null)
        }}
        onCreated={() => {
          void refetch()
        }}
      />
    </div>
  )
}
