import { useCallback, useEffect, useState } from "react"

const CHANGE_EVENT = "url-state-change"

function readParam(key: string): string | null {
  if (typeof window === "undefined") return null
  return new URLSearchParams(window.location.search).get(key)
}

function writeParam(key: string, value: string | null) {
  const params = new URLSearchParams(window.location.search)
  if (value === null) {
    params.delete(key)
  } else {
    params.set(key, value)
  }
  const query = params.toString()
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
  )
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

/**
 * Syncs a single value with a URL search param (via history.replaceState, so
 * no navigation occurs). Dialogs, modal steps, and tabs built on this are
 * deep-linkable and survive refreshes and back/forward navigation.
 */
export function useUrlState(key: string): [string | null, (value: string | null) => void] {
  const [value, setValue] = useState<string | null>(() => readParam(key))

  useEffect(() => {
    const sync = () => setValue(readParam(key))
    window.addEventListener("popstate", sync)
    window.addEventListener(CHANGE_EVENT, sync as EventListener)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener(CHANGE_EVENT, sync as EventListener)
    }
  }, [key])

  const set = useCallback(
    (next: string | null) => {
      writeParam(key, next)
      setValue(next)
    },
    [key]
  )

  return [value, set]
}
