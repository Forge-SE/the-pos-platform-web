const OPS_TOKEN_KEY = "pos.ops-token"

export const OPS_TOKEN_CHANGED_EVENT = "ops:token-changed"

interface OpsTokenPayload {
  role?: string
  restaurantId?: string
  exp?: number
}

function decodePayload(token: string): OpsTokenPayload | null {
  try {
    const [, body] = token.split(".")
    if (!body) return null
    return JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
  } catch {
    return null
  }
}

export function getOpsToken(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(OPS_TOKEN_KEY)
}

export function setOpsToken(token: string): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(OPS_TOKEN_KEY, token)
  window.dispatchEvent(new Event(OPS_TOKEN_CHANGED_EVENT))
}

export function clearOpsToken(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(OPS_TOKEN_KEY)
  window.dispatchEvent(new Event(OPS_TOKEN_CHANGED_EVENT))
}

export function isOpsAuthenticated(): boolean {
  const token = getOpsToken()
  if (!token) return false
  const payload = decodePayload(token)
  if (!payload || payload.role !== "PLATFORM_ADMIN") return false
  if (payload.restaurantId && payload.restaurantId !== "platform") return false
  if (payload.exp && Date.now() / 1000 > payload.exp) return false
  return true
}

export function opsAuthContext() {
  const token = getOpsToken()
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }
}
