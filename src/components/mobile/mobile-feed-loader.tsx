import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { SpinnerGapIcon } from "@phosphor-icons/react"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"

export function MobileFeedLoader({
  pageIndex,
  hasMore,
  busy,
  error,
  count,
  scope,
  noProgress,
  scrollRoot,
  onLoadMore,
  onRetry,
}: {
  pageIndex: number
  hasMore: boolean
  busy: boolean
  error: boolean
  count: number
  scope: string
  noProgress: boolean
  scrollRoot: RefObject<HTMLDivElement | null>
  onLoadMore: (pageIndex: number) => void
  onRetry?: () => void
}) {
  const { t } = useLanguage()
  const sentinel = useRef<HTMLDivElement>(null)
  const requested = useRef<string | null>(null)
  const [supported] = useState(
    () => typeof IntersectionObserver !== "undefined"
  )
  useEffect(() => {
    if (!supported || !hasMore || busy || error || noProgress || count === 0)
      return
    const target = sentinel.current
    if (!target) return
    const container = scrollRoot.current
    let active = true
    const root =
      container && container.scrollHeight > container.clientHeight
        ? container
        : null
    const observer = new IntersectionObserver(
      (entries) => {
        if (!active) return
        if (!entries.some((entry) => entry.isIntersecting)) return
        const request = `${scope}:${pageIndex + 1}`
        if (requested.current === request) return
        requested.current = request
        onLoadMore(pageIndex + 1)
      },
      { root, rootMargin: "0px 0px 400px 0px" }
    )
    observer.observe(target)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [
    supported,
    hasMore,
    busy,
    error,
    noProgress,
    count,
    scope,
    pageIndex,
    onLoadMore,
    scrollRoot,
  ])
  return (
    <div className="py-4 text-center text-sm text-muted-foreground">
      <div ref={sentinel} aria-hidden className="h-px" />
      {busy && count > 0 ? (
        <p role="status" className="flex items-center justify-center gap-2">
          <SpinnerGapIcon
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          {t("Loading more…")}
        </p>
      ) : error && count > 0 ? (
        <div role="alert">
          <p>{t("Could not load more items.")}</p>
          {onRetry && (
            <Button
              size="lg"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                requested.current = null
                onRetry()
              }}
            >
              {t("Try again")}
            </Button>
          )}
        </div>
      ) : hasMore &&
        !busy &&
        !error &&
        (!supported || noProgress || count === 0) ? (
        <Button
          size="lg"
          variant="ghost"
          onClick={() => {
            if (requested.current === `${scope}:${pageIndex + 1}`) return
            requested.current = `${scope}:${pageIndex + 1}`
            onLoadMore(pageIndex + 1)
          }}
        >
          {t("Load more")}
        </Button>
      ) : !hasMore && count > 0 ? (
        <p role="status">{t("You’re all caught up")}</p>
      ) : null}
    </div>
  )
}
