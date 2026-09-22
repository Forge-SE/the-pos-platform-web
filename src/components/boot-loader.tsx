import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChartDonutIcon } from "@phosphor-icons/react"

const MIN_DISPLAY_MS = 2200
const EXIT_MS = 0.7
const INTRO_DELAY_MS = 450

export function BootLoader() {
  const [visible, setVisible] = useState(true)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const startedAt = performance.now()
    let raf = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const hide = () => {
      const elapsed = performance.now() - startedAt
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)
      timer = setTimeout(() => setVisible(false), remaining)
    }

    if (document.readyState === "complete") {
      hide()
    } else {
      const onLoad = () => hide()
      window.addEventListener("load", onLoad, { once: true })
      // Fallback so a stalled `load` event never traps the user.
      timer = setTimeout(() => setVisible(false), MIN_DISPLAY_MS + 4000)
      return () => {
        window.removeEventListener("load", onLoad)
        if (timer) clearTimeout(timer)
      }
    }

    return () => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-primary"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: "-100%", opacity: 1 }}
          transition={{ duration: EXIT_MS, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <motion.span
              className="flex size-14 items-center justify-center rounded-2xl bg-[#1F4D2E] text-primary shadow-lg"
              initial={reduceMotion ? { opacity: 0 } : { x: -64, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: INTRO_DELAY_MS / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <ChartDonutIcon className="size-8" weight="bold" />
            </motion.span>
            <span className="overflow-hidden">
              <motion.span
                className="font-heading block text-4xl font-semibold tracking-tight text-[#1F4D2E]"
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { x: "-110%", opacity: 0 }
                }
                animate={{ x: "0%", opacity: 1 }}
                transition={{
                  duration: 0.7,
                  delay: INTRO_DELAY_MS / 1000 + 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                Ovaal
              </motion.span>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
