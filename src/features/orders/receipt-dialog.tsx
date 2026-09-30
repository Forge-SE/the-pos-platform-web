import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { PrinterIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DigitalReceipt } from "./digital-receipt"
import type { ReceiptDetails } from "./digital-receipt"

const RECEIPT_QUERY = gql`
  query OrderReceipt($orderId: ID!) {
    receipt(orderId: $orderId) {
      id
      receiptNumber
      status
      text
      details {
        restaurantName
        restaurantAddress
        restaurantLogoUrl
        currency
        orderId
        diningType
        createdAt
        lines {
          name
          quantity
          unitPrice
          lineTotal
          notes
          modifiers
        }
        subtotal
        discount
        tip
        total
        paymentMethod
        amountPaid
      }
    }
  }
`

interface ReceiptData {
  receipt: {
    id: string
    receiptNumber: string
    status: string
    text: string
    details: ReceiptDetails
  } | null
}

export function ReceiptDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, loading, error, refetch } = useQuery<ReceiptData>(
    RECEIPT_QUERY,
    {
      skip: !open || !orderId,
      variables: { orderId: orderId ?? "" },
      fetchPolicy: "network-only",
    }
  )
  const receipt =
    data?.receipt?.details.orderId === orderId ? data.receipt : null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 print:hidden" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(92svh,760px)] w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg print:static print:max-h-none print:w-full print:translate-none print:border-0 print:shadow-none">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 print:hidden">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-[-0.02em]">
                Receipt {receipt ? `#${receipt.receiptNumber}` : ""}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                Your digital copy, ready to view or print.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close receipt"
              className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 print:overflow-visible print:p-0">
            {loading && !receipt ? (
              <p role="status" className="text-sm text-muted-foreground">
                Preparing receipt…
              </p>
            ) : error ? (
              <div role="alert" className="text-sm">
                <p>Couldn’t load the receipt.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 print:hidden"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : receipt ? (
              <>
                <div className="print:hidden">
                  <DigitalReceipt
                    receiptNumber={receipt.receiptNumber}
                    details={receipt.details}
                  />
                </div>
                <div className="hidden print:block">
                  {receipt.details.restaurantLogoUrl && (
                    <img
                      src={receipt.details.restaurantLogoUrl}
                      alt={`${receipt.details.restaurantName} logo`}
                      className="mx-auto mb-2 size-16 object-contain"
                    />
                  )}
                  <pre className="receipt-print mx-auto hidden w-fit font-mono text-[11px] leading-[1.5] whitespace-pre text-black print:block">
                    {receipt.text}
                  </pre>
                </div>
              </>
            ) : (
              <div role="status" className="text-sm text-muted-foreground">
                <p>No receipt is available for this order yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void refetch()}
                >
                  Check again
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-border/60 p-3 print:hidden">
            <Button
              className="flex-1"
              disabled={!receipt || loading || Boolean(error)}
              onClick={() => window.print()}
            >
              <PrinterIcon aria-hidden="true" data-icon="inline-start" />
              Print receipt
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
