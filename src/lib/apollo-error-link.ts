import { onError } from "@apollo/client/link/error"

export const APOLLO_ERROR_EVENT = "apollo:error"
export const APOLLO_UNAUTHENTICATED_EVENT = "apollo:unauthenticated"

export interface ApolloErrorDetail {
  message: string
}

interface ErrorPayload {
  graphQLErrors?:
    | readonly {
        message?: string
        extensions?: { code?: string }
      }[]
    | null
  networkError?: { message?: string; statusCode?: number } | null
}

export function friendlyGraphQlError(raw: string | undefined): string {
  const message = raw ?? ""

  if (/cannot query field/i.test(message)) {
    return "This feature is not available on the server yet."
  }
  if (
    /not authenticated|unauthenticated|unauthori[zs]ed|authentication required/i.test(
      message
    )
  ) {
    return "Your session has expired. Please sign in again."
  }
  if (
    /failed to fetch|network error|fetch failed|econnrefused/i.test(message)
  ) {
    return "We couldn’t reach the server. Check your connection and try again."
  }
  if (/rate limit|too many requests/i.test(message)) {
    return "You’re doing that too often. Please wait a moment and try again."
  }

  return message || "Something went wrong. Please try again."
}

function isAuthenticationError(payload: ErrorPayload): boolean {
  return Boolean(
    payload.graphQLErrors?.some(
      (error) =>
        error.extensions?.code === "UNAUTHENTICATED" ||
        /not authenticated|unauthenticated|unauthori[zs]ed|authentication required/i.test(
          error.message ?? ""
        )
    ) || payload.networkError?.statusCode === 401
  )
}

export const apolloErrorLink = onError((options) => {
  const payload = options as unknown as ErrorPayload
  const rawMessage =
    payload.graphQLErrors?.[0]?.message ?? payload.networkError?.message

  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<ApolloErrorDetail>(APOLLO_ERROR_EVENT, {
      detail: { message: friendlyGraphQlError(rawMessage) },
    })
  )

  if (isAuthenticationError(payload)) {
    window.dispatchEvent(new Event(APOLLO_UNAUTHENTICATED_EVENT))
  }
})
