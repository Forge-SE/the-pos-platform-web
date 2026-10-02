import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { PlusIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toaster"
import {
  cedisToPesewas,
  formatMoney,
  mutationMessage,
} from "@/features/menu/model"

const PRICING_SETTINGS = gql`
  query PricingSettings {
    restaurantTaxes {
      id
      name
      rateBps
      inclusive
      isActive
    }
    discountCampaigns {
      id
      name
      scheduleType
      percentBps
      amount
      code
      startsAt
      endsAt
      maxUses
      usedCount
      status
    }
  }
`
const CREATE_TAX = gql`
  mutation CreateRestaurantTax($input: TaxInput!) {
    createRestaurantTax(input: $input) {
      id
    }
  }
`
const SET_TAX_ACTIVE = gql`
  mutation SetRestaurantTaxActive($id: ID!, $active: Boolean!) {
    setRestaurantTaxActive(id: $id, active: $active) {
      id
    }
  }
`
const CREATE_DISCOUNT = gql`
  mutation CreateDiscountCampaign($input: DiscountCampaignInput!) {
    createDiscountCampaign(input: $input) {
      id
    }
  }
`
const SET_DISCOUNT_STATUS = gql`
  mutation SetDiscountCampaignStatus($id: ID!, $status: DiscountStatus!) {
    setDiscountCampaignStatus(id: $id, status: $status) {
      id
    }
  }
`

type Tax = {
  id: string
  name: string
  rateBps: number
  inclusive: boolean
  isActive: boolean
}
type Campaign = {
  id: string
  name: string
  scheduleType: "ONE_TIME" | "SCHEDULED" | "CODE"
  percentBps: number | null
  amount: number | null
  code: string | null
  startsAt: string | null
  endsAt: string | null
  maxUses: number | null
  usedCount: number
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED"
}

export function PricingSettings() {
  const { data, loading, error, refetch } = useQuery<{
    restaurantTaxes: Tax[]
    discountCampaigns: Campaign[]
  }>(PRICING_SETTINGS)
  const [createTax, taxState] = useMutation(CREATE_TAX)
  const [setTaxActive] = useMutation(SET_TAX_ACTIVE)
  const [createDiscount, discountState] = useMutation(CREATE_DISCOUNT)
  const [setDiscountStatus] = useMutation(SET_DISCOUNT_STATUS)
  const [taxName, setTaxName] = useState("")
  const [taxRate, setTaxRate] = useState("")
  const [taxInclusive, setTaxInclusive] = useState(false)
  const [name, setName] = useState("")
  const [scheduleType, setScheduleType] =
    useState<Campaign["scheduleType"]>("CODE")
  const [valueType, setValueType] = useState<"PERCENT" | "AMOUNT">("PERCENT")
  const [value, setValue] = useState("")
  const [code, setCode] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")

  async function addTax() {
    const percent = Number(taxRate)
    if (!taxName.trim() || !Number.isFinite(percent) || percent < 0) return
    try {
      await createTax({
        variables: {
          input: {
            name: taxName.trim(),
            rateBps: Math.round(percent * 100),
            inclusive: taxInclusive,
          },
        },
      })
      await refetch()
      setTaxName("")
      setTaxRate("")
      setTaxInclusive(false)
      toast({ title: "Tax added", status: "success" })
    } catch (caught) {
      toast({
        title: "Could not add tax",
        description: mutationMessage(caught, "Check the tax details."),
        status: "error",
      })
    }
  }

  async function addDiscount() {
    const numeric = Number(value)
    const amount = valueType === "AMOUNT" ? cedisToPesewas(value) : null
    if (
      !name.trim() ||
      !Number.isFinite(numeric) ||
      numeric <= 0 ||
      (valueType === "AMOUNT" && amount === null)
    )
      return
    try {
      await createDiscount({
        variables: {
          input: {
            name: name.trim(),
            scheduleType,
            percentBps:
              valueType === "PERCENT" ? Math.round(numeric * 100) : null,
            amount,
            code: scheduleType === "CODE" ? code.trim().toUpperCase() : null,
            startsAt: startsAt ? new Date(startsAt).toISOString() : null,
            endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          },
        },
      })
      await refetch()
      setName("")
      setValue("")
      setCode("")
      setStartsAt("")
      setEndsAt("")
      toast({ title: "Discount created as draft", status: "success" })
    } catch (caught) {
      toast({
        title: "Could not create discount",
        description: mutationMessage(caught, "Check the discount details."),
        status: "error",
      })
    }
  }

  if (loading)
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Loading taxes and discounts…
      </p>
    )
  if (error)
    return (
      <p className="mt-6 text-sm text-destructive">
        Taxes and discounts could not be loaded.
      </p>
    )

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.025em]">Taxes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active taxes are calculated automatically on new orders.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
          <Input
            value={taxName}
            onChange={(e) => setTaxName(e.target.value)}
            placeholder="Tax name"
            aria-label="Tax name"
          />
          <Input
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            placeholder="Rate %"
            inputMode="decimal"
            aria-label="Tax rate percent"
          />
          <Button
            onClick={() => void addTax()}
            disabled={taxState.loading || !taxName.trim() || !taxRate}
          >
            <PlusIcon data-icon="inline-start" />
            Add
          </Button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />{" "}
          Included in menu prices
        </label>
        <ul className="mt-5 divide-y divide-border/60">
          {(data?.restaurantTaxes ?? []).map((tax) => (
            <li
              key={tax.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{tax.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(tax.rateBps / 100).toFixed(2)}% ·{" "}
                  {tax.inclusive ? "Included" : "Added at checkout"}
                </p>
              </div>
              <Switch
                checked={tax.isActive}
                aria-label={`${tax.isActive ? "Disable" : "Enable"} ${tax.name}`}
                onCheckedChange={async (active) => {
                  await setTaxActive({ variables: { id: tax.id, active } })
                  await refetch()
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.025em]">
          Discount campaigns
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a draft, review it, then activate it for the cashier.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            aria-label="Campaign name"
          />
          <Select
            value={scheduleType}
            onValueChange={(next) => next && setScheduleType(next)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CODE">Code</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="ONE_TIME">One-time</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={valueType}
            onValueChange={(next) => next && setValueType(next)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">Percentage</SelectItem>
              <SelectItem value="AMOUNT">Fixed amount</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={valueType === "PERCENT" ? "Percent" : "Amount (GHS)"}
            inputMode="decimal"
            aria-label="Discount value"
          />
          {scheduleType === "CODE" && (
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code"
              className="uppercase sm:col-span-2"
              aria-label="Discount code"
            />
          )}
          {scheduleType === "SCHEDULED" && (
            <>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                aria-label="Discount starts"
              />
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                aria-label="Discount ends"
              />
            </>
          )}
          <Button
            className="sm:col-span-2"
            onClick={() => void addDiscount()}
            disabled={
              discountState.loading ||
              !name.trim() ||
              !value ||
              (scheduleType === "CODE" && !code.trim())
            }
          >
            Create draft
          </Button>
        </div>
        <ul className="mt-5 divide-y divide-border/60">
          {(data?.discountCampaigns ?? []).map((campaign) => (
            <li
              key={campaign.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{campaign.name}</p>
                <p className="text-xs text-muted-foreground">
                  {campaign.percentBps != null
                    ? `${campaign.percentBps / 100}%`
                    : formatMoney(campaign.amount ?? 0)}
                  {campaign.code ? ` · ${campaign.code}` : ""} ·{" "}
                  {campaign.usedCount}
                  {campaign.maxUses ? `/${campaign.maxUses}` : ""} uses
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await setDiscountStatus({
                    variables: {
                      id: campaign.id,
                      status:
                        campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                    },
                  })
                  await refetch()
                }}
              >
                {campaign.status === "ACTIVE" ? "Pause" : "Activate"}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
