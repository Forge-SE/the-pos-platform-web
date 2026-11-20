import { useEffect, useState } from "react"
import { ChartDonutIcon } from "@phosphor-icons/react"

const MIN_DISPLAY_MS = 2200
/** Matches the `boot-exit` animation in styles.css. */
const EXIT_MS = 700

/**
 * Brand splash shown while the app starts. Animated with CSS (see the
 * `boot-*` rules in styles.css) rather than framer-motion, which kept a
 * ~40 KB gzipped library on the sign-in page's critical path.
 */
export function BootLoader() {
  const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown")

  useEffect(() => {
    const startedAt = performance.now()
    let timer: ReturnType<typeof setTimeout> | undefined

    const hide = () => {
      const elapsed = performance.now() - startedAt
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)
      clearTimeout(timer)
      timer = setTimeout(() => setPhase("leaving"), remaining)
    }

    if (document.readyState === "complete") {
      hide()
      return () => clearTimeout(timer)
    }
    const onLoad = () => hide()
    window.addEventListener("load", onLoad, { once: true })
    // Fallback so a stalled `load` event (a slow image, say) never traps the user.
    timer = setTimeout(() => setPhase("leaving"), MIN_DISPLAY_MS + 4000)
    return () => {
      window.removeEventListener("load", onLoad)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (phase !== "leaving") return
    const timer = setTimeout(() => setPhase("gone"), EXIT_MS)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase === "gone") return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [phase])

  if (phase === "gone") return null

  return (
    <div
      aria-hidden="true"
      data-leaving={phase === "leaving" || undefined}
      className="boot-screen fixed inset-0 z-[100] flex items-center justify-center bg-primary"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="boot-mark flex size-14 items-center justify-center rounded-2xl bg-[#1F4D2E] text-primary shadow-lg">
          <ChartDonutIcon className="size-8" weight="bold" />
        </span>
        <span className="overflow-hidden">
          <span className="boot-word block font-brand text-4xl font-semibold tracking-tight text-[#1F4D2E]">
            Ovaal
          </span>
        </span>
      </div>
    </div>
  )
}
