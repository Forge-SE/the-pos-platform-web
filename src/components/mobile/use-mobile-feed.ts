import { useEffect, useState } from "react"
import type { ReactElement } from "react"

type Page<T> = { items: readonly T[]; elements: readonly ReactElement[] }
function same<T>(left: readonly T[] | undefined, right: readonly T[]) {
  return (
    left?.length === right.length &&
    left.every((item, index) => item === right[index])
  )
}

/** Keep remote batches mounted; local windows are supplied fresh by their feature. */
export function useMobileFeed<T>({
  enabled,
  scope,
  pageIndex,
  items,
  elements,
  busy,
  error,
  provided,
  getKey,
}: {
  enabled: boolean
  scope: string
  pageIndex: number
  items: readonly T[]
  elements: readonly ReactElement[]
  busy: boolean
  error: boolean
  provided: boolean
  getKey: (item: T) => string
}) {
  const [cache, setCache] = useState<{
    scope: string
    lastPage: number
    pages: Map<number, Page<T>>
  }>(() => ({ scope, lastPage: pageIndex, pages: new Map() }))
  const restart =
    cache.scope !== scope ||
    (pageIndex === 0 && cache.lastPage > 0) ||
    (pageIndex > cache.lastPage + 1 && !cache.pages.has(pageIndex - 1))
  const pages = restart ? new Map<number, Page<T>>() : new Map(cache.pages)
  if (enabled && !provided && !busy && !error)
    pages.set(pageIndex, { items, elements })

  useEffect(() => {
    if (!enabled || provided) return
    setCache((previous) => {
      const reset =
        previous.scope !== scope ||
        (pageIndex === 0 && previous.lastPage > 0) ||
        (pageIndex > previous.lastPage + 1 &&
          !previous.pages.has(pageIndex - 1))
      const previousPage = reset ? undefined : previous.pages.get(pageIndex)
      if (
        !reset &&
        previous.lastPage === pageIndex &&
        (busy ||
          error ||
          (same(previousPage?.items, items) &&
            same(previousPage?.elements, elements)))
      )
        return previous
      const next = reset ? new Map<number, Page<T>>() : new Map(previous.pages)
      if (!busy && !error) next.set(pageIndex, { items, elements })
      return { scope, lastPage: pageIndex, pages: next }
    })
  }, [enabled, provided, scope, pageIndex, items, elements, busy, error])

  if (!enabled || provided)
    return { items: [...items], elements: [...elements], noProgress: false }
  const mergedItems = new Map<string, T>()
  const mergedElements = new Map<string, ReactElement>()
  const priorIds = new Set<string>()
  for (const [index, page] of [...pages].sort(
    ([left], [right]) => left - right
  )) {
    if (index > pageIndex) continue
    page.items.forEach((item, itemIndex) => {
      const key = getKey(item) || `${index}:${itemIndex}`
      mergedItems.set(key, item)
      if (index < pageIndex) priorIds.add(key)
    })
    page.elements.forEach((element, itemIndex) =>
      mergedElements.set(
        String(element.key ?? `${index}:${itemIndex}`),
        element
      )
    )
  }
  const noProgress =
    pageIndex > 0 &&
    !busy &&
    !error &&
    priorIds.size > 0 &&
    items.every((item) => priorIds.has(getKey(item)))
  return {
    items: [...mergedItems.values()],
    elements: [...mergedElements.values()],
    noProgress,
  }
}
