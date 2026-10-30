import { useEffect, useState } from "react"
import type { ComponentProps } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { motion, useReducedMotion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"
import { useMediaQuery } from "@/lib/use-media-query"
import {
  mobileInstant,
  mobileSpring,
} from "@/components/layout/mobile/mobile-motion"

/** Shared dialog content/state, with a mobile page instead of a cramped desktop modal. */
export function AdaptiveDialogPopup({
  className,
  mobileClassName = "",
  children,
  ...props
}: ComponentProps<typeof Dialog.Popup> & { mobileClassName?: string }) {
  const compact = useMediaQuery("(max-width: 1023px)")
  const reduced = useReducedMotion()
  const [viewportHeight, setViewportHeight] = useState<number>()
  useEffect(() => {
    if (!compact) return
    const viewport = window.visualViewport
    const update = () =>
      setViewportHeight(viewport?.height ?? window.innerHeight)
    update()
    viewport?.addEventListener("resize", update)
    window.addEventListener("resize", update)
    return () => {
      viewport?.removeEventListener("resize", update)
      window.removeEventListener("resize", update)
    }
  }, [compact])
  if (!compact)
    return (
      <Dialog.Popup {...props} className={className}>
        {children}
      </Dialog.Popup>
    )
  return (
    <Dialog.Popup
      {...props}
      className={`mobile-dialog-page fixed inset-0 z-[80] flex h-dvh w-full min-w-0 flex-col overflow-y-auto overscroll-contain bg-card text-card-foreground outline-none ${mobileClassName}`}
      render={(elementProps, state) => (
        <motion.div
          {...(elementProps as HTMLMotionProps<"div">)}
          style={{ ...elementProps.style, height: viewportHeight }}
          initial={reduced ? false : { opacity: 0, x: 24 }}
          animate={{
            opacity: state.open ? 1 : 0,
            x: state.open || reduced ? 0 : 24,
          }}
          transition={reduced ? mobileInstant : mobileSpring}
        />
      )}
    >
      {children}
    </Dialog.Popup>
  )
}
