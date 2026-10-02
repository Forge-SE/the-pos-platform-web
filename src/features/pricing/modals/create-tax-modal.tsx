import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toaster"
import { mutationMessage } from "@/features/menu/model"
import { CREATE_TAX } from "@/features/pricing/model"
import { PricingDialog } from "@/features/pricing/modals/pricing-dialog"

export function CreateTaxModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [createTax, taxState] = useMutation(CREATE_TAX)
  const [name, setName] = useState("")
  const [rate, setRate] = useState("")
  const [inclusive, setInclusive] = useState(false)

  useEffect(() => {
    if (open) return
    setName("")
    setRate("")
    setInclusive(false)
  }, [open])

  async function submit() {
    const percent = Number(rate)
    if (
      !name.trim() ||
      !Number.isFinite(percent) ||
      percent < 0 ||
      percent > 100
    ) {
      toast({
        title: "Check the tax details",
        description: "Enter a name and a rate between 0% and 100%.",
        status: "error",
      })
      return
    }
    try {
      await createTax({
        variables: {
          input: {
            name: name.trim(),
            rateBps: Math.round(percent * 100),
            inclusive,
          },
        },
      })
      onCreated()
      onOpenChange(false)
      toast({ title: "Tax created", status: "success" })
    } catch (caught) {
      toast({
        title: "Could not create tax",
        description: mutationMessage(caught, "Check the tax details."),
        status: "error",
      })
    }
  }

  return (
    <PricingDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create tax"
      description="Active taxes are calculated automatically on new orders."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={taxState.loading || !name.trim() || !rate}
          >
            {taxState.loading ? "Creating…" : "Create tax"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="tax-name">Name</Label>
          <Input
            id="tax-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="VAT"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tax-rate">Rate (%)</Label>
          <Input
            id="tax-rate"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            inputMode="decimal"
            placeholder="15"
          />
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          Included in menu prices
          <Switch checked={inclusive} onCheckedChange={setInclusive} />
        </label>
      </div>
    </PricingDialog>
  )
}
