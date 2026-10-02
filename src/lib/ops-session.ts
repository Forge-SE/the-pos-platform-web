import { graphqlUrl } from "@/lib/graphql-url"
import {
  clearOpsToken,
  getOpsRefreshToken,
  getOpsToken,
  setOpsSession,
} from "@/lib/ops-token"

const REFRESH_SESSION = `
  mutation RefreshOpsSession($refreshToken: String!) {
    refreshSession(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`

let refreshPromise: Promise<string | null> | null = null

class InvalidSessionError extends Error {}

function expiresSoon(token: string): boolean {
  try {
    const body = token.split(".")[1]
    if (!body) return true
    const payload = JSON.parse(
      window.atob(body.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number }
    return !payload.exp || payload.exp * 1000 <= Date.now() + 30_000
  } catch {
    return true
  }
}

async function requestRefresh(): Promise<string | null> {
  const refreshToken = getOpsRefreshToken()
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
    data?: {
      refreshSession?: { accessToken: string; refreshToken: string }
    }
    errors?: unknown[]
  }
  const session = result.data?.refreshSession
  if (!session || result.errors?.length) {
    throw new InvalidSessionError("Session refresh rejected")
  }
  setOpsSession(session)
  return session.accessToken
}

export function refreshOpsAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh()
      .catch((error: unknown) => {
        if (error instanceof InvalidSessionError) {
          clearOpsToken()
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

export async function getValidOpsAccessToken(): Promise<string | null> {
  const accessToken = getOpsToken()
  if (accessToken && !expiresSoon(accessToken)) return accessToken
  if (!getOpsRefreshToken()) return accessToken
  return refreshOpsAccessToken()
}
