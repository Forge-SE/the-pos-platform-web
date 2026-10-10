import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { ReceiptIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { ContentState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import { InfoTooltip } from "@/components/info-tooltip"
import { toast } from "@/components/ui/toaster"
import { mutationMessage } from "@/features/menu/model"
import { SET_TAX_PROFILE, TAX_PROFILE_QUERY, taxRateLabel } from "./model"
import type { TaxConfiguration, TaxPriceMode, TaxProfileCode } from "./model"

export function TaxProfileForm({
  onSaved,
  allowCustom = true,
}: {
  onSaved?: (configuration: TaxConfiguration) => void
  allowCustom?: boolean
}) {
  const { data, loading, error, refetch } = useQuery<{
    taxConfiguration: TaxConfiguration
    taxProfiles: Array<{
      profileCode: string
      label: string
      effectiveFrom: string
      rules: Array<{ name: string; rateBps: number }>
    }>
  }>(TAX_PROFILE_QUERY, {
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  })
  const [save, state] = useMutation<{ setTaxProfile: TaxConfiguration }>(
    SET_TAX_PROFILE
  )
  const [profile, setProfile] = useState<TaxProfileCode>("NOT_REGISTERED")
  const [mode, setMode] = useState<TaxPriceMode>("INCLUSIVE")
  const [advanced, setAdvanced] = useState(false)
  useEffect(() => {
    if (!data) return
    setProfile(data.taxConfiguration.profileCode)
    setMode(
      data.taxConfiguration.priceMode === "EXCLUSIVE"
        ? "EXCLUSIVE"
        : "INCLUSIVE"
    )
    setAdvanced(data.taxConfiguration.profileCode === "CUSTOM")
  }, [data])
  if (loading && !data && !error) return <LoadingState label="tax profile" />
  if (error)
    return (
      <ContentState
        error
        icon={<WarningCircleIcon />}
        title="Tax profiles could not be loaded."
        description={
          error.message.includes("No effective tax rules")
            ? "Tax rules are unavailable for this business. Contact your platform administrator to complete tax setup, then try again."
            : "Try again. If the problem continues, contact your platform administrator."
        }
        action={
          <Button
            variant="outline"
            size="lg"
            disabled={loading}
            onClick={() => void refetch().catch(() => {})}
          >
            {loading ? "Trying again…" : "Try again"}
          </Button>
        }
      />
    )
  if (!data || data.taxProfiles.length === 0)
    return (
      <ContentState
        icon={<ReceiptIcon />}
        title="No tax profiles available."
        description="Your platform administrator needs to configure tax profiles before you can choose one."
        action={
          <Button
            variant="outline"
            size="lg"
            disabled={loading}
            onClick={() => void refetch().catch(() => {})}
          >
            {loading ? "Trying again…" : "Try again"}
          </Button>
        }
      />
    )
  const selected = data.taxProfiles.find(
    (entry) => entry.profileCode === profile
  )
  async function submit() {
    try {
      const result = await save({
        variables: { input: { profileCode: profile, priceMode: mode } },
      })
      await refetch()
      toast({ title: "Tax profile saved", status: "success" })
      if (result.data) onSaved?.(result.data.setTaxProfile)
    } catch (caught) {
      toast({
        title: "Could not save tax profile",
        description: mutationMessage(caught, "Try again."),
        status: "error",
      })
    }
  }
  return (
    <div className="space-y-5">
      <fieldset className="space-y-3" disabled={state.loading}>
        <legend className="mb-3 text-sm font-semibold">
          Business tax profile
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.taxProfiles.map((entry) => (
            <label
              key={entry.profileCode}
              className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${profile === entry.profileCode ? "border-secondary bg-secondary/5" : "border-border/70 bg-card"}`}
            >
              <input
                type="radio"
                name="tax-profile"
                value={entry.profileCode}
                checked={profile === entry.profileCode}
                onChange={() => setProfile(entry.profileCode as TaxProfileCode)}
                className="mt-1 accent-secondary"
              />
              <span>
                <span className="block text-sm font-semibold">
                  {entry.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {entry.rules.length
                    ? entry.rules
                        .map(
                          (rule) => `${rule.name} ${taxRateLabel(rule.rateBps)}`
                        )
                        .join(" + ")
                    : "I don’t charge VAT. No tax is added."}
                </span>
              </span>
            </label>
          ))}
        </div>
        {(allowCustom || data.taxConfiguration.profileCode === "CUSTOM") && (
          <details
            open={advanced}
            onToggle={(event) => setAdvanced(event.currentTarget.open)}
          >
            <summary className="cursor-pointer py-2 text-sm text-muted-foreground">
              Other / custom
            </summary>
            <label className="flex gap-3 rounded-lg border border-border/70 p-4">
              <input
                type="radio"
                name="tax-profile"
                checked={profile === "CUSTOM"}
                onChange={() => setProfile("CUSTOM")}
              />
              <span className="text-sm">Use my custom tax rates</span>
            </label>
          </details>
        )}
      </fieldset>
      {profile === "GH_STANDARD" && (
        <fieldset className="space-y-3" disabled={state.loading}>
          <legend className="text-sm font-semibold">Menu prices</legend>
          <p className="text-xs leading-5 text-muted-foreground">
            Your menu prices stay the same. This choice changes how tax is
            calculated and the amount the customer pays.
          </p>
          {(["INCLUSIVE", "EXCLUSIVE"] as const).map((value) => (
            <label key={value} className="flex items-center gap-3 text-sm">
              <input
                type="radio"
                name="price-mode"
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              <span>
                {value === "INCLUSIVE"
                  ? "Include tax in menu prices"
                  : "Add tax at checkout"}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-950 dark:text-amber-200">
        <InfoTooltip label="Important tax rules information">
          {selected?.rules.length
            ? `Current rules effective ${new Date(selected.effectiveFrom).toLocaleDateString("en-GH")}. `
            : ""}
          Applies to new orders. Previous sales keep their saved tax breakdown.
        </InfoTooltip>
        <p>
          {selected?.rules.length
            ? `Current rules effective ${new Date(selected.effectiveFrom).toLocaleDateString("en-GH")}. `
            : ""}
          Applies to new orders. Previous sales keep their saved tax breakdown.
        </p>
      </div>
      <Button disabled={state.loading} onClick={() => void submit()}>
        {state.loading ? "Saving…" : "Save tax profile"}
      </Button>
    </div>
  )
}
