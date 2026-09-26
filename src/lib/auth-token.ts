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
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null
    return payload as AccessTokenProfile
  } catch {
    return null
  }
}
