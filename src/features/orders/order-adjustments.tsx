import { useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toaster"
import { formatMoney, mutationMessage } from "@/features/menu/model"

const COMP_ORDER = gql`
  mutation CompTicket($input: CompOrderInput!) {
    compOrder(input: $input) {
      id
      total
      isComp
    }
  }
`
const RECORD_REFUND = gql`
  mutation RecordTicketRefund($input: RecordRefundInput!) {
    recordOrderRefund(input: $input) {
      id
      amount
      salesAmount
      taxAmount
      tipAmount
    }
  }
`

export function OrderAdjustments({
  order,
  onUpdated,
}: {
  order: {
    id: string
    status: string
    total: number
    isComp: boolean
    payment: { method: string; amount: number } | null
    refunds: Array<{ amount: number }>
  }
  onUpdated: () => void
}) {
  const [comp, compState] = useMutation(COMP_ORDER)
  const [refund, refundState] = useMutation(RECORD_REFUND)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [reference, setReference] = useState("")
  const [returned, setReturned] = useState(false)
  const refundKey = useRef(crypto.randomUUID())
  const remaining =
    (order.payment?.amount ?? 0) -
    order.refunds.reduce((sum, entry) => sum + entry.amount, 0)
  const canComp =
    !order.payment &&
    !order.isComp &&
    order.status !== "COMPLETED" &&
    order.status !== "CANCELLED"
  const canRefund = order.status === "COMPLETED" && remaining > 0
  if (!canComp && !canRefund) return null
  const busy = compState.loading || refundState.loading
  async function submit() {
    if (!reason.trim()) {
      toast({ title: "Enter a reason", status: "error" })
      return
    }
    try {
      if (canComp) {
        await comp({ variables: { input: { orderId: order.id, reason } } })
        toast({
          title: "Order comped",
          description: "The full subtotal is comped and no payment is due.",
          status: "success",
        })
      } else {
        const pesewas = Math.round(Number(amount) * 100)
        if (
          !returned ||
          !Number.isFinite(pesewas) ||
          pesewas <= 0 ||
          pesewas > remaining
        ) {
          toast({
            title: "Check the refund",
            description:
              "Enter an amount within the remaining balance and confirm the money has been returned.",
            status: "error",
          })
          return
        }
        await refund({
          variables: {
            input: {
              orderId: order.id,
              idempotencyKey: refundKey.current,
              amount: pesewas,
              reason,
              reference: reference || null,
            },
          },
        })
        toast({ title: "Refund recorded", status: "success" })
      }
      onUpdated()
    } catch (caught) {
      toast({
        title: "Could not update order",
        description: mutationMessage(caught, "Try again."),
        status: "error",
      })
    }
  }
  return (
    <details className="mt-5 border-t border-border/70 pt-4">
      <summary className="cursor-pointer py-2 text-sm font-semibold">
        {canComp ? "Comp this order" : "Record a refund"}
      </summary>
      <div className="mt-3 space-y-4">
        <p className="text-xs text-muted-foreground">
          {canComp
            ? "Comp the full subtotal and remove the voluntary tip. The order stays in the kitchen workflow with no payment due."
            : `Remaining refundable: ${formatMoney(remaining)}. Return the money first, then record it here. This does not send a transfer.`}
        </p>
        {canRefund && (
          <>
            <div>
              <Label htmlFor="refund-amount">Amount returned (GHS)</Label>
              <Input
                id="refund-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                max={remaining / 100}
                step="0.01"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  refundKey.current = crypto.randomUUID()
                }}
                disabled={busy}
              />
            </div>
            {order.payment?.method !== "CASH" && (
              <div>
                <Label htmlFor="refund-reference">
                  Completed refund reference
                </Label>
                <Input
                  id="refund-reference"
                  value={reference}
                  onChange={(event) => {
                    setReference(event.target.value)
                    refundKey.current = crypto.randomUUID()
                  }}
                  disabled={busy}
                />
              </div>
            )}
          </>
        )}
        <div>
          <Label htmlFor="adjustment-reason">Reason</Label>
          <Input
            id="adjustment-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              refundKey.current = crypto.randomUUID()
            }}
            disabled={busy}
          />
        </div>
        {canRefund && (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={returned}
              onChange={(event) => setReturned(event.target.checked)}
              disabled={busy}
              className="mt-1"
            />
            <span>I have returned this amount to the customer.</span>
          </label>
        )}
        <Button
          variant="outline"
          disabled={busy || !reason.trim() || (canRefund && !returned)}
          onClick={() => void submit()}
        >
          {busy
            ? "Saving…"
            : canComp
              ? "Confirm full comp"
              : "Record completed refund"}
        </Button>
      </div>
    </details>
  )
}
