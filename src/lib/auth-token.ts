const ACCESS_TOKEN_KEY = "pos.access-token"
const REFRESH_TOKEN_KEY = "pos.refresh-token"

export const AUTH_TOKEN_CHANGED_EVENT = "auth:token-changed"

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

export interface AuthSessionTokens {
  accessToken: string
  refreshToken: string
}

export function setAuthSession(tokens: AuthSessionTokens): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  window.sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  // Remove the old browser-wide token so it cannot overwrite another tab.
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT))
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT))
}

export type RestaurantRole = "CASHIER" | "KITCHEN" | "MANAGER" | "OWNER"

export interface AccessTokenProfile {
  sub: string
  restaurantId: string
  name: string
  role: RestaurantRole
  permissions?: string[]
  exp?: number
}

export function getAccessTokenProfile(): AccessTokenProfile | null {
  const token = getAccessToken()
  if (!token) return null

  try {
    const encodedPayload = token.split(".")[1]
    if (!encodedPayload) return null
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(
      window.atob(normalized)
    ) as Partial<AccessTokenProfile>
    if (
      !payload.sub ||
      !payload.restaurantId ||
      !payload.name ||
      !payload.role
    ) {
      return null
    }
    if (
      payload.permissions !== undefined &&
      !Array.isArray(payload.permissions)
    ) {
      return null
    }
    // An expired access token can still describe the current tab while its
    // refresh token is used to renew the session before the next request.
    if (payload.exp && payload.exp * 1000 <= Date.now() && !getRefreshToken()) {
      return null
    }
    return payload as AccessTokenProfile
  } catch {
    return null
  }
}
