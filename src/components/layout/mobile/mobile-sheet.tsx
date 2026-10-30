import { useRef } from "react"
import type { ReactNode } from "react"
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion"
import { mobileInstant, mobileSpring } from "./mobile-motion"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const actions = useRef<Dialog.Root.Actions | null>(null)
  const dragControls = useDragControls()
  const reducedMotion = useReducedMotion()
  const transition = reducedMotion ? mobileInstant : mobileSpring
  return (
    <Dialog.Root actionsRef={actions} open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal keepMounted>
        <AnimatePresence
          initial={false}
          onExitComplete={() => actions.current?.unmount()}
        >
          {open && (
            <motion.div key="sheet" initial="closed" animate="open" exit="exit">
              <Dialog.Backdrop
                render={
                  <motion.div
                    variants={{
                      closed: { opacity: 0 },
                      open: { opacity: 1 },
                      exit: { opacity: 0 },
                    }}
                    transition={transition}
                  />
                }
                className="fixed inset-0 z-[60] bg-black/35"
              />
              <Dialog.Popup
                render={
                  <motion.div
                    variants={{
                      closed: {
                        y: reducedMotion ? 0 : "100%",
                        opacity: reducedMotion ? 0 : 1,
                      },
                      open: { y: 0, opacity: 1 },
                      exit: { y: reducedMotion ? 0 : 24, opacity: 0 },
                    }}
                    transition={transition}
                    drag={reducedMotion ? false : "y"}
                    dragControls={dragControls}
                    dragListener={false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.3 }}
                    dragSnapToOrigin
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 80 || info.velocity.y > 600)
                        onOpenChange(false)
                    }}
                  />
                }
                className="mobile-sheet fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-popover text-popover-foreground shadow-xl outline-none"
              >
                <div
                  aria-hidden
                  className="flex h-6 shrink-0 touch-none items-center justify-center"
                  onPointerDown={(event) => dragControls.start(event)}
                >
                  <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                </div>
                <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-1 pb-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold tracking-tight">
                      {t(title)}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                      {t(description)}
                    </Dialog.Description>
                  </div>
                  <Dialog.Close
                    render={
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={t("Close")}
                        className="-mt-1 -mr-2 rounded-full"
                      />
                    }
                  >
                    <XIcon aria-hidden />
                  </Dialog.Close>
                </header>
                <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
                  {children}
                </div>
              </Dialog.Popup>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
