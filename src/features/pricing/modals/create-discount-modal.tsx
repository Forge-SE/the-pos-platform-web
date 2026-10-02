import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toaster"
import { cedisToPesewas, mutationMessage } from "@/features/menu/model"
import { CREATE_DISCOUNT } from "@/features/pricing/model"
import type { Campaign, CreatedCampaign } from "@/features/pricing/model"
import { DiscountReveal } from "@/features/pricing/discount-reveal"
import { PricingDialog } from "@/features/pricing/modals/pricing-dialog"

export function CreateDiscountModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [createDiscount, discountState] = useMutation<{
    createDiscountCampaign: CreatedCampaign
  }>(CREATE_DISCOUNT)
  const [created, setCreated] = useState<CreatedCampaign | null>(null)
  const [name, setName] = useState("")
  const [scheduleType, setScheduleType] =
    useState<Campaign["scheduleType"]>("CODE")
  const [valueType, setValueType] = useState<"PERCENT" | "AMOUNT">("PERCENT")
  const [value, setValue] = useState("")
  const [code, setCode] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")

  useEffect(() => {
    if (open) return
    setCreated(null)
    setName("")
    setScheduleType("CODE")
    setValueType("PERCENT")
    setValue("")
    setCode("")
    setStartsAt("")
    setEndsAt("")
  }, [open])

  async function submit() {
    const numeric = Number(value)
    const amount = valueType === "AMOUNT" ? cedisToPesewas(value) : null
    if (
      !name.trim() ||
      !Number.isFinite(numeric) ||
      numeric <= 0 ||
      (valueType === "PERCENT" && numeric > 100) ||
      (valueType === "AMOUNT" && amount === null) ||
      (scheduleType === "CODE" && !code.trim())
    ) {
      toast({
        title: "Check the discount details",
        description:
          "Enter a name, a value, and a code when this is a code discount.",
        status: "error",
      })
      return
    }
    try {
      const result = await createDiscount({
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
      const campaign = result.data?.createDiscountCampaign
      if (!campaign) throw new Error("Discount was not returned.")
      setCreated(campaign)
      onCreated()
    } catch (caught) {
      toast({
        title: "Could not create discount",
        description: mutationMessage(caught, "Check the discount details."),
        status: "error",
      })
    }
  }

  const revealing = created !== null

  return (
    <PricingDialog
      open={open}
      onOpenChange={onOpenChange}
      title={revealing ? "Discount created" : "Create discount"}
      description={
        revealing
          ? created.code
            ? "Scratch the ticket to reveal the code."
            : "Scratch the ticket to reveal the amount."
          : "New discounts start as drafts. Activate one when the till should use it."
      }
      footer={
        <div className="flex justify-end gap-2">
          {revealing ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void submit()}
                disabled={
                  discountState.loading ||
                  !name.trim() ||
                  !value ||
                  (scheduleType === "CODE" && !code.trim())
                }
              >
                {discountState.loading ? "Creating…" : "Create discount"}
              </Button>
            </>
          )}
        </div>
      }
    >
      {created ? (
        <DiscountReveal campaign={created} />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="discount-name">Name</Label>
            <Input
              id="discount-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekend special"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Schedule</Label>
              <Select
                value={scheduleType}
                onValueChange={(next) => {
                  if (
                    next === "CODE" ||
                    next === "SCHEDULED" ||
                    next === "ONE_TIME"
                  ) {
                    setScheduleType(next)
                  }
                }}
              >
                <SelectTrigger className="w-full" aria-label="Schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE">Code</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="ONE_TIME">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Value</Label>
              <Select
                value={valueType}
                onValueChange={(next) => {
                  if (next === "PERCENT" || next === "AMOUNT")
                    setValueType(next)
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Discount value type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentage</SelectItem>
                  <SelectItem value="AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="discount-value">
              {valueType === "PERCENT" ? "Percent" : "Amount (GHS)"}
            </Label>
            <Input
              id="discount-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              inputMode="decimal"
              placeholder={valueType === "PERCENT" ? "10" : "5.00"}
            />
          </div>
          {scheduleType === "CODE" && (
            <div className="grid gap-2">
              <Label htmlFor="discount-code">Code</Label>
              <Input
                id="discount-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="WEEKEND10"
                className="uppercase"
              />
            </div>
          )}
          {scheduleType === "SCHEDULED" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="discount-starts">Starts</Label>
                <Input
                  id="discount-starts"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount-ends">Ends</Label>
                <Input
                  id="discount-ends"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </PricingDialog>
  )
}
