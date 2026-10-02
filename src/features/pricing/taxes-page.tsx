import { useMutation, useQuery } from "@apollo/client/react"
import { PlusIcon } from "@phosphor-icons/react"
import { Navigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
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

export function TaxesPage() {
  const profile = getAccessTokenProfile()
  const canManage = profile?.role === "MANAGER" || profile?.role === "OWNER"
  const { data, loading, error, refetch } = useQuery<{
    restaurantTaxes: Tax[]
  }>(TAXES_QUERY, { skip: !canManage })
  const [setTaxActive] = useMutation(SET_TAX_ACTIVE)
  const [newTax, setNewTax] = useUrlState("newTax")

  if (!canManage) return <Navigate to="/overview" replace />

  const taxes = data?.restaurantTaxes ?? []

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Taxes
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Active taxes are calculated automatically on new orders.
          </p>
        </header>
        <Button onClick={() => setNewTax("1")}>
          <PlusIcon data-icon="inline-start" />
          Create tax
        </Button>
      </div>

      <section className="mt-8">
        {error ? (
          <div className="rounded-lg bg-destructive/5 p-5 text-sm text-destructive">
            Taxes could not be loaded.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
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
                  : taxes.map((tax) => (
                      <tr
                        key={tax.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3.5 font-medium">{tax.name}</td>
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
            </table>
            {!loading && taxes.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-medium">No taxes yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use “Create tax” to add the first rate.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

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
