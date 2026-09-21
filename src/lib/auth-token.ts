const ACCESS_TOKEN_KEY = "pos.access-token"

export const AUTH_TOKEN_CHANGED_EVENT = "auth:token-changed"

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT))
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT))
}
