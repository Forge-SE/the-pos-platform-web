import { useEffect, useState } from "react"

/** Hide fixed mobile chrome while an input is covered by the software keyboard. */
export function useMobileKeyboard() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => {
      const editing = document.activeElement?.matches(
        "input, textarea, [contenteditable=true]"
      )
      setOpen(Boolean(editing && window.innerHeight - viewport.height > 150))
    }
    update()
    viewport.addEventListener("resize", update)
    document.addEventListener("focusin", update)
    document.addEventListener("focusout", update)
    return () => {
      viewport.removeEventListener("resize", update)
      document.removeEventListener("focusin", update)
      document.removeEventListener("focusout", update)
    }
  }, [])
  return open
}
