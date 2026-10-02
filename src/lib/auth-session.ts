import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from "@/lib/auth-token"
import type { AuthSessionTokens } from "@/lib/auth-token"
import { graphqlUrl } from "@/lib/graphql-url"

const REFRESH_SESSION = `
  mutation RefreshSession($refreshToken: String!) {
    refreshSession(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`

let refreshPromise: Promise<string | null> | null = null

class InvalidSessionError extends Error {}

function expiresSoon(token: string, leewaySeconds = 30): boolean {
  try {
    const encodedPayload = token.split(".")[1]
    if (!encodedPayload) return true
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(window.atob(normalized)) as { exp?: number }
    return (
      !payload.exp || payload.exp * 1000 <= Date.now() + leewaySeconds * 1000
    )
  } catch {
    return true
  }
}

async function requestRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: REFRESH_SESSION,
      variables: { refreshToken },
    }),
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new InvalidSessionError("Session refresh rejected")
    }
    throw new Error("Session refresh failed")
  }

  const result = (await response.json()) as {
    data?: { refreshSession?: AuthSessionTokens }
    errors?: unknown[]
  }
  const session = result.data?.refreshSession
  if (!session || result.errors?.length) {
    throw new InvalidSessionError("Session refresh rejected")
  }
  setAuthSession(session)
  return session.accessToken
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh()
      .catch((error: unknown) => {
        if (error instanceof InvalidSessionError) {
          clearAuthSession()
          return null
        }
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken()
  if (accessToken && !expiresSoon(accessToken)) return accessToken
  if (!getRefreshToken()) return accessToken
  return refreshAccessToken()
}

export async function restoreSession(): Promise<void> {
  if (!getRefreshToken()) return
  await getValidAccessToken()
}
