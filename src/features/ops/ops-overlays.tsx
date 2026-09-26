import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

export function OpsDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border/70 bg-card shadow-lg transition-transform duration-200 data-ending-style:translate-x-full data-starting-style:translate-x-full">
          <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-[-0.025em]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">
                  Restaurant details
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Close">
                  <XIcon />
                </Button>
              }
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
            {children}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function OpsModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children?: ReactNode
  footer: ReactNode
  wide?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={`fixed top-1/2 left-1/2 z-[60] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/70 bg-card p-5 shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 ${wide ? "max-h-[min(90vh,920px)] max-w-4xl overflow-y-auto" : "max-w-md"}`}
        >
          <Dialog.Title className="text-lg font-semibold tracking-[-0.025em]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </Dialog.Description>
          {children}
          <div className="mt-5 flex justify-end gap-2">{footer}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
