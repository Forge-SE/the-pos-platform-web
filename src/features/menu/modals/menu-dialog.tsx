import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

export function MenuDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
  drawer = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  drawer?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={
            drawer
              ? "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-border/70 bg-card shadow-lg transition-transform duration-200 data-ending-style:translate-x-full data-starting-style:translate-x-full motion-reduce:transition-none"
              : `fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-lg transition-[transform,opacity] duration-150 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0 ${wide ? "max-w-2xl" : "max-w-lg"}`
          }
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-foreground/10 px-4 pt-4 pb-3 sm:px-5">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-[-0.025em]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close dialog"
                >
                  <XIcon />
                </Button>
              }
            />
          </div>
          <div className="content-region min-h-0 flex-1 [scrollbar-width:thin] overflow-y-scroll px-4 py-6 sm:px-5">
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-foreground/10 bg-card px-4 py-3 sm:px-5">
              {footer}
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
