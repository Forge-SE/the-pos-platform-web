import { AdaptiveDialogPopup } from "@/components/mobile/adaptive-dialog-popup"
import { useState } from "react"
import { gql } from "@apollo/client"
import { useLazyQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { DownloadSimpleIcon, XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

const ACCOUNTANT_EXPORT = gql`
  query AccountantSalesExport($from: String!, $to: String!) {
    accountantExport(from: $from, to: $to) {
      dailyCsv
      ordersCsv
      itemsCsv
      taxesCsv
      paymentsCsv
      refundsCsv
    }
  }
`

interface ExportPack {
  dailyCsv: string
  ordersCsv: string
  itemsCsv: string
  taxesCsv: string
  paymentsCsv: string
  refundsCsv: string
}

function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AccountantExport({ from, to }: { from: string; to: string }) {
  const [open, setOpen] = useState(false)
  const [pack, setPack] = useState<ExportPack | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [load, { loading }] = useLazyQuery<{ accountantExport: ExportPack }>(
    ACCOUNTANT_EXPORT,
    {
      fetchPolicy: "no-cache",
    }
  )

  async function prepare() {
    setOpen(true)
    setPack(null)
    setError(null)
    try {
      const result = await load({ variables: { from, to } })
      if (!result.data?.accountantExport)
        throw new Error("Export data was empty")
      setPack(result.data.accountantExport)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not prepare the export."
      )
    }
  }

  const files: Array<{ key: keyof ExportPack; label: string; detail: string }> =
    [
      {
        key: "dailyCsv",
        label: "Daily summary",
        detail: "Sales and collections by order business date",
      },
      {
        key: "ordersCsv",
        label: "Order ledger",
        detail: "Order-level sales, tax, tips, payments, and refunds",
      },
      {
        key: "itemsCsv",
        label: "Sale items",
        detail: "Saved item names, quantities, prices, and captured unit costs",
      },
      {
        key: "taxesCsv",
        label: "Tax lines",
        detail: "Tax names, rates, and original amounts on each order",
      },
      {
        key: "paymentsCsv",
        label: "Payments",
        detail: "Each recorded payment and its reference",
      },
      {
        key: "refundsCsv",
        label: "Refunds",
        detail: "Each refund split across sales, tax, and tips",
      },
    ]

  return (
    <>
      <Button variant="outline" onClick={() => void prepare()}>
        <DownloadSimpleIcon aria-hidden="true" data-icon="inline-start" />
        Accountant export
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
          <AdaptiveDialogPopup
            mobileClassName="px-5"
            className="fixed top-1/2 left-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-xl outline-none sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-lg font-semibold">
                  Accountant export
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {from} to {to} · GHS · order business dates
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close export"
                  />
                }
              >
                <XIcon aria-hidden />
              </Dialog.Close>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Payments and refunds reflect records available when you prepare
              this export. Download each CSV for your accountant.
            </p>
            {loading && (
              <p role="status" className="mt-5 text-sm">
                Preparing files…
              </p>
            )}
            {error && (
              <p role="alert" className="mt-5 text-sm text-destructive">
                {error}
              </p>
            )}
            {pack && (
              <ul className="mt-5 divide-y divide-border/70">
                {files.map((file) => (
                  <li
                    key={file.key}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {file.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {file.detail}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Download ${file.label}`}
                      onClick={() =>
                        downloadCsv(
                          `sales-${file.key.replace("Csv", "")}-${from}-to-${to}.csv`,
                          pack[file.key]
                        )
                      }
                    >
                      <DownloadSimpleIcon aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </AdaptiveDialogPopup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
