import { useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { WalletIcon } from "@phosphor-icons/react"
import { OvaalMark } from "@/components/ovaal-mark"
import { EmptyState, ErrorState } from "@/components/content-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toaster"
import { formatMoney, mutationMessage } from "@/features/menu/model"
import { PricingDialog } from "@/features/pricing/modals/pricing-dialog"
import { ReceiptDialog } from "@/features/orders/receipt-dialog"
import { useUrlState } from "@/lib/url-state"

export const SHIFT_CLOSURE_CHECK = gql`
  query ShiftClosureCheck($shiftId: ID!) {
    shiftClosureCheck(shiftId: $shiftId) {
      shiftId
      activeOrderCount
      unpaidOrders {
        id
        total
        status
        createdAt
        diningType
        momoAttempt {
          id
          reference
          status
          amount
          providerStatus
          displayText
          failureReason
        }
      }
    }
  }
`

const RECORD_RECEIVED = gql`
  mutation RecordReceivedShiftPayment($input: RecordReceivedPaymentInput!) {
    recordReceivedPayment(input: $input) {
      id
      orderId
      receiptDeliveryStatus
    }
  }
`
const VERIFY_MOMO = gql`
  mutation VerifyShiftMomoPayment($reference: String!) {
    verifyMomoPayment(reference: $reference) {
      id
      status
      displayText
      failureReason
      receiptDeliveryStatus
    }
  }
`

export interface UnpaidShiftOrder {
  id: string
  total: number
  status: string
  createdAt: string
  diningType: string
  momoAttempt: {
    id: string
    reference: string
    status: "PENDING" | "SUCCESS" | "FAILED"
    amount: number
    providerStatus: string | null
    displayText: string | null
    failureReason: string | null
  } | null
}
export interface ClosureCheck {
  shiftId: string
  activeOrderCount: number
  unpaidOrders: UnpaidShiftOrder[]
}

export function ShiftPayments({
  check,
  loading,
  error,
  canRecord,
  onRefresh,
}: {
  check?: ClosureCheck
  loading: boolean
  error: boolean
  canRecord: boolean
  onRefresh: () => Promise<unknown>
}) {
  const [selectedId, setSelectedId] = useUrlState("reconcileOrder")
  const [receiptId, setReceiptId] = useUrlState("shiftReceipt")
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const checking = useRef(false)
  const [verify] = useMutation<{
    verifyMomoPayment: {
      status: string
      displayText: string | null
      failureReason: string | null
      receiptDeliveryStatus: string
    }
  }>(VERIFY_MOMO)
  const selected = check?.unpaidOrders.find((order) => order.id === selectedId)

  async function refresh() {
    try {
      await onRefresh()
    } catch {
      toast({
        title: "Couldn’t refresh payment status",
        description: "Try again before closing the shift.",
        status: "error",
      })
    }
  }
  async function verifyPayment(order: UnpaidShiftOrder) {
    if (!order.momoAttempt || checking.current) return
    checking.current = true
    setCheckingId(order.id)
    try {
      const result = await verify({
        variables: { reference: order.momoAttempt.reference },
      })
      const attempt = result.data?.verifyMomoPayment
      if (!attempt) throw new Error("No payment status was returned.")
      const paid = attempt.status === "SUCCESS"
      toast({
        title: paid ? "MoMo payment verified" : "MoMo payment not confirmed",
        description: paid
          ? attempt.receiptDeliveryStatus === "FAILED"
            ? "Payment saved. Receipt delivery needs a retry."
            : "Payment saved. The customer was not charged again."
          : attempt.failureReason ||
            attempt.displayText ||
            "No payment has been recorded. Check again after the provider confirms it.",
        status: paid ? "success" : "error",
      })
      if (paid && attempt.receiptDeliveryStatus === "FAILED")
        setReceiptId(order.id)
    } catch (caught) {
      toast({
        title: "Couldn’t verify MoMo payment",
        description: mutationMessage(
          caught,
          "Try checking the existing payment again."
        ),
        status: "error",
      })
    } finally {
      await refresh()
      checking.current = false
      setCheckingId(null)
    }
  }

  return (
    <section
      className="content-region rounded-xl border border-border/70 bg-card p-5"
      aria-labelledby="shift-payments-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="shift-payments-title"
            className="text-lg font-semibold tracking-[-0.025em]"
          >
            Payments needing attention
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Resolve completed orders before closing. Receipt failures do not
            block closing.
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          disabled={loading || Boolean(checkingId)}
          onClick={() => void refresh()}
        >
          {loading ? "Checking…" : "Refresh payments"}
        </Button>
      </div>
      <div className="content-region mt-4">
        {error ? (
          <ErrorState
            title="Couldn’t check shift payments."
            onRetry={onRefresh}
          />
        ) : !check ? (
          <div
            role="status"
            aria-label="Checking shift payments"
            className="flex min-h-80 flex-1 items-center justify-center"
          >
            <span className="motion-safe:animate-pulse">
              <OvaalMark elevated={false} />
            </span>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground" role="status">
              <span className="font-medium text-foreground tabular-nums">
                {check.unpaidOrders.length}
              </span>{" "}
              completed{" "}
              {check.unpaidOrders.length === 1 ? "order needs" : "orders need"}{" "}
              payment recorded.
              {check.activeOrderCount > 0 &&
                ` ${check.activeOrderCount} active ${check.activeOrderCount === 1 ? "order must" : "orders must"} also be completed or voided.`}
            </p>
            {check.unpaidOrders.length === 0 ? (
              <EmptyState
                icon={<WalletIcon className="size-7" />}
                title="Completed-order payments are up to date"
                description={
                  check.activeOrderCount
                    ? "Finish or void the remaining active orders, then count the cash drawer."
                    : "Count the cash drawer to close the shift."
                }
                action={
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      document.getElementById("counted-cash")?.focus()
                    }
                  >
                    Count cash
                  </Button>
                }
              />
            ) : (
              <div className="max-h-[32rem] [scrollbar-width:thin] overflow-y-auto">
                <ul className="divide-y divide-border/60">
                  {check.unpaidOrders.map((order) => (
                    <li
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Order {order.id.slice(-6).toUpperCase()}{" "}
                          <span className="ml-2 tabular-nums">
                            {formatMoney(order.total)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString("en-GH")} ·{" "}
                          {order.diningType.toLowerCase().replaceAll("_", " ")}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                          {order.momoAttempt
                            ? `MoMo ${order.momoAttempt.status === "SUCCESS" ? "needs sync" : order.momoAttempt.status.toLowerCase()}`
                            : "No payment recorded"}
                        </Badge>
                      </div>
                      {canRecord ? (
                        order.momoAttempt ? (
                          <Button
                            variant="outline"
                            size="lg"
                            disabled={Boolean(checkingId) || loading}
                            onClick={() => void verifyPayment(order)}
                          >
                            {checkingId === order.id
                              ? "Checking…"
                              : "Check MoMo payment"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="lg"
                            disabled={Boolean(checkingId) || loading}
                            onClick={() => setSelectedId(order.id)}
                          >
                            Record received payment
                          </Button>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Ask a cashier with payment access to resolve this
                          order.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      {selected && !selected.momoAttempt && canRecord && (
        <ReceivedPaymentDialog
          key={selected.id}
          order={selected}
          onClose={() => setSelectedId(null)}
          onSaved={async (receiptFailed) => {
            setSelectedId(null)
            if (receiptFailed) setReceiptId(selected.id)
            await refresh()
          }}
          onRefresh={refresh}
        />
      )}
      <ReceiptDialog
        orderId={receiptId}
        open={Boolean(receiptId)}
        onOpenChange={(open) => {
          if (!open) setReceiptId(null)
        }}
      />
    </section>
  )
}

function ReceivedPaymentDialog({
  order,
  onClose,
  onSaved,
  onRefresh,
}: {
  order: UnpaidShiftOrder
  onClose: () => void
  onSaved: (receiptFailed: boolean) => Promise<void>
  onRefresh: () => Promise<void>
}) {
  const [method, setMethod] = useState<"CASH" | "TRANSFER">("CASH")
  const [reference, setReference] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<{ signature: string; key: string } | null>(null)
  const submitting = useRef(false)
  const [record, { loading }] = useMutation<{
    recordReceivedPayment: { receiptDeliveryStatus: string }
  }>(RECORD_RECEIVED)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current || !confirmed) return
    if (method === "TRANSFER" && !reference.trim()) {
      setError("Enter the bank transfer reference.")
      return
    }
    const signature = JSON.stringify({
      orderId: order.id,
      method,
      reference: reference.trim() || null,
    })
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() }
    submitting.current = true
    setError(null)
    try {
      const result = await record({
        variables: {
          input: {
            idempotencyKey: request.current.key,
            orderId: order.id,
            method,
            reference: reference.trim() || null,
            confirmed: true,
          },
        },
      })
      if (!result.data?.recordReceivedPayment)
        throw new Error(
          "The payment could not be confirmed. Refresh its status before retrying."
        )
      const receiptFailed =
        result.data.recordReceivedPayment.receiptDeliveryStatus === "FAILED"
      toast({
        title: "Received payment recorded",
        description: receiptFailed
          ? "Payment saved. Receipt delivery needs a retry."
          : "The order is paid. No new charge was made.",
        status: "success",
      })
      await onSaved(receiptFailed)
    } catch (caught) {
      setError(mutationMessage(caught, "Couldn’t record this payment."))
      await onRefresh()
    } finally {
      submitting.current = false
    }
  }
  return (
    <PricingDialog
      open
      onOpenChange={(open) => {
        if (!open && !loading) onClose()
      }}
      title="Record received payment"
      description={`Order ${order.id.slice(-6).toUpperCase()} · ${formatMoney(order.total)}. This records money already received; it does not charge the customer.`}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-5">
        <fieldset disabled={loading} className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Received payment method
          </legend>
          <div className="flex gap-2">
            {(["CASH", "TRANSFER"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="lg"
                variant={method === value ? "default" : "outline"}
                aria-pressed={method === value}
                onClick={() => {
                  setMethod(value)
                  setConfirmed(false)
                  setError(null)
                }}
              >
                {value === "CASH" ? "Cash" : "Bank transfer"}
              </Button>
            ))}
          </div>
        </fieldset>
        {method === "TRANSFER" && (
          <div className="space-y-2">
            <Label htmlFor="received-payment-reference">
              Bank transfer reference
            </Label>
            <Input
              id="received-payment-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={loading}
              required
              maxLength={160}
            />
          </div>
        )}
        <Label
          htmlFor="received-payment-confirmed"
          className="flex min-h-11 items-center gap-3 leading-6"
        >
          <Checkbox
            id="received-payment-confirmed"
            checked={confirmed}
            onCheckedChange={setConfirmed}
            disabled={loading}
          />
          I confirm {formatMoney(order.total)} was already received by{" "}
          {method === "CASH" ? "cash" : "bank transfer"}.
        </Label>
        <p className="text-xs leading-5 text-muted-foreground">
          Do not use this for MoMo payments or money that has not been received.
          The confirmation is saved in the audit trail.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="lg"
            disabled={
              loading ||
              !confirmed ||
              (method === "TRANSFER" && !reference.trim())
            }
          >
            {loading ? "Recording…" : "Confirm received payment"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </PricingDialog>
  )
}
