import { diningLabel } from "./labels"

export interface ReceiptDetails {
  restaurantName: string
  restaurantAddress: string | null
  restaurantLogoUrl: string | null
  currency: string
  orderId: string
  diningType: string
  deliveryAddress: string | null
  createdAt: string
  lines: Array<{
    name: string
    quantity: number
    unitPrice: number
    lineTotal: number
    notes: string | null
    modifiers: string[] | null
  }>
  subtotal: number
  discount: number
  taxAmount: number
  taxes: Array<{
    name: string
    rateBps: number
    amount: number
    inclusive: boolean
  }>
  tip: number
  total: number
  paymentMethod: string | null
  amountPaid: number | null
}

const paymentLabels: Record<string, string> = {
  CASH: "Cash",
  MOMO: "Mobile money",
  TRANSFER: "Bank transfer",
}

export function DigitalReceipt({
  receiptNumber,
  details,
}: {
  receiptNumber: string
  details: ReceiptDetails
}) {
  const money = (amount: number) =>
    `${details.currency} ${(amount / 100).toFixed(2)}`

  return (
    <article
      aria-label={`Digital receipt ${receiptNumber}`}
      className="rounded-xl border border-border/70 bg-card p-5 text-sm sm:p-6"
    >
      <header className="border-b border-dashed border-border pb-5 text-center">
        {details.restaurantLogoUrl && (
          <img
            src={details.restaurantLogoUrl}
            alt={`${details.restaurantName} logo`}
            className="mx-auto mb-3 size-14 rounded-xl object-cover"
          />
        )}
        <p className="text-lg font-semibold tracking-tight">
          {details.restaurantName}
        </p>
        {details.restaurantAddress && (
          <p className="mt-1 text-xs text-muted-foreground">
            {details.restaurantAddress}
          </p>
        )}
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {receiptNumber}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(details.createdAt).toLocaleString("en-GH", {
            timeZone: "Africa/Accra",
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </header>
      <div className="flex justify-between gap-3 py-4 text-xs text-muted-foreground">
        <span>
          Order{" "}
          <span className="font-semibold text-foreground">
            {details.orderId.slice(-6).toUpperCase()}
          </span>
        </span>
        <span>{diningLabel(details.diningType)}</span>
      </div>
      {details.deliveryAddress && (
        <div className="mb-4 rounded-lg bg-muted/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Delivery address
          </p>
          <p className="mt-1 text-sm text-foreground">
            {details.deliveryAddress}
          </p>
        </div>
      )}
      <ul className="space-y-4 pb-5">
        {details.lines.map((line, index) => (
          <li key={index}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium break-words">
                  {line.quantity} × {line.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {money(line.unitPrice)} each
                </p>
              </div>
              <span className="shrink-0 tabular-nums">
                {money(line.lineTotal)}
              </span>
            </div>
            {Boolean(line.modifiers?.length) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {line.modifiers?.join(" · ")}
              </p>
            )}
            {line.notes && (
              <p className="mt-1 text-xs text-muted-foreground">{line.notes}</p>
            )}
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-dashed border-border pt-4">
        <ReceiptRow label="Subtotal" value={money(details.subtotal)} />
        {details.discount > 0 && (
          <ReceiptRow label="Discount" value={`−${money(details.discount)}`} />
        )}
        {details.taxes.map((tax) => (
          <ReceiptRow
            key={`${tax.name}-${tax.rateBps}`}
            label={`${tax.name}${tax.inclusive ? " (included)" : ""}`}
            value={money(tax.amount)}
          />
        ))}
        {details.tip > 0 && (
          <ReceiptRow label="Kitchen tip" value={money(details.tip)} />
        )}
        <div className="flex justify-between gap-4 py-2 text-lg font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(details.total)}</dd>
        </div>
        <ReceiptRow
          label="Payment at issue"
          value={
            details.paymentMethod
              ? (paymentLabels[details.paymentMethod] ?? details.paymentMethod)
              : "No payment recorded"
          }
        />
        {details.amountPaid !== null && (
          <ReceiptRow label="Amount paid" value={money(details.amountPaid)} />
        )}
      </dl>
      <p className="mt-5 border-t border-dashed border-border pt-4 text-center text-xs text-muted-foreground">
        Thank you for your order.
      </p>
    </article>
  )
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-muted-foreground">
      <dt>{label}</dt>
      <dd className="text-right text-foreground tabular-nums">{value}</dd>
    </div>
  )
}
