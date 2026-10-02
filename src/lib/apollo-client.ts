import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  Observable,
  from,
  split,
} from "@apollo/client"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { getMainDefinition } from "@apollo/client/utilities"
import { createClient } from "graphql-ws"

import { apolloErrorLink } from "@/lib/apollo-error-link"
import { getValidAccessToken, refreshAccessToken } from "@/lib/auth-session"
import { graphqlUrl } from "@/lib/graphql-url"
import {
  getValidOpsAccessToken,
  refreshOpsAccessToken,
} from "@/lib/ops-session"

interface GraphQlResultWithErrors {
  errors?: readonly { extensions?: { code?: string } }[]
}

function hasAuthenticationError(result: GraphQlResultWithErrors): boolean {
  return Boolean(
    result.errors?.some((error) => error.extensions?.code === "UNAUTHENTICATED")
  )
}

function getGraphqlWsUrl() {
  const configuredUrl = import.meta.env.VITE_GRAPHQL_WS_URL
  if (configuredUrl) return configuredUrl

  const url = new URL(graphqlUrl, window.location.origin)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return url.toString()
}

const authLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    let subscription: { unsubscribe: () => void } | undefined
    const tokenPromise =
      operation.getContext().authScope === "ops"
        ? getValidOpsAccessToken()
        : getValidAccessToken()
    void tokenPromise
      .then((accessToken) => {
        operation.setContext(
          ({ headers = {} }: { headers?: Record<string, string> }) => ({
            headers: accessToken
              ? { ...headers, authorization: `Bearer ${accessToken}` }
              : headers,
          })
        )
        subscription = forward(operation).subscribe(observer)
      })
      .catch((error: unknown) => observer.error(error))

    return () => subscription?.unsubscribe()
  })
})

const authRetryLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    let subscription: { unsubscribe: () => void } | undefined
    let retried = false

    const run = () => {
      subscription = forward(operation).subscribe({
        next: (result) => {
          if (!retried && hasAuthenticationError(result)) {
            retried = true
            subscription?.unsubscribe()
            const refreshPromise =
              operation.getContext().authScope === "ops"
                ? refreshOpsAccessToken()
                : refreshAccessToken()
            void refreshPromise
              .then((accessToken) => {
                if (!accessToken) {
                  observer.next(result)
                  observer.complete()
                  return
                }
                operation.setContext(
                  ({ headers = {} }: { headers?: Record<string, string> }) => ({
                    headers: {
                      ...headers,
                      authorization: `Bearer ${accessToken}`,
                    },
                  })
                )
                run()
              })
              .catch((error: unknown) => observer.error(error))
            return
          }
          observer.next(result)
        },
        error: (error: unknown) => observer.error(error),
        complete: () => observer.complete(),
      })
    }

    run()
    return () => subscription?.unsubscribe()
  })
})

export function createApolloClient() {
  const httpLink = from([
    authLink,
    authRetryLink,
    new HttpLink({ uri: graphqlUrl }),
  ])
  const transportLink = import.meta.env.SSR
    ? httpLink
    : split(
        ({ query }) => {
          const definition = getMainDefinition(query)
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          )
        },
        new GraphQLWsLink(
          createClient({
            url: getGraphqlWsUrl(),
            lazy: true,
            retryAttempts: 10,
            connectionParams: async () => {
              const accessToken = await getValidAccessToken()
              return accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}
            },
          })
        ),
        httpLink
      )

  return new ApolloClient({
    ssrMode: import.meta.env.SSR,
    link: from([apolloErrorLink, transportLink]),
    cache: new InMemoryCache(),
  })
}
