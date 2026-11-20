/**
 * Polling budget for slow and metered connections.
 *
 * Every poll re-downloads a whole result, so on a 3G link polling is the
 * largest source of traffic while the app sits open. The rules:
 *
 * - Data that already arrives over a websocket subscription polls only as a
 *   slow safety net (`FALLBACK`), in case the socket silently dropped events.
 * - Status that changes rarely and has no subscription polls at `STATUS`.
 * - One component owns a poll; others read the same query from the cache.
 * - No poll runs while the tab is hidden or the device is offline
 *   (`shouldSkipPoll`, applied to every query in `createApolloClient`).
 */
export const POLL_INTERVAL = {
  /** Safety net for data that is also pushed over a subscription. */
  FALLBACK: 120_000,
  /** Status with no subscription, such as the open shift or stock levels. */
  STATUS: 60_000,
  /** A screen someone is actively watching, such as the shift close checklist. */
  WATCHED: 30_000,
} as const

export function shouldSkipPoll(): boolean {
  if (typeof document === "undefined") return false
  if (document.visibilityState === "hidden") return true
  return typeof navigator !== "undefined" && navigator.onLine === false
}
