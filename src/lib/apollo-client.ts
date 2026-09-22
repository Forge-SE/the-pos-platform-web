import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  from,
  split,
} from "@apollo/client"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { getMainDefinition } from "@apollo/client/utilities"
import { createClient } from "graphql-ws"

import { apolloErrorLink } from "@/lib/apollo-error-link"
import { getAccessToken } from "@/lib/auth-token"

const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL ??
  (import.meta.env.SSR ? "http://localhost:4000/graphql" : "/graphql")

function getGraphqlWsUrl() {
  const configuredUrl = import.meta.env.VITE_GRAPHQL_WS_URL
  if (configuredUrl) return configuredUrl

  const url = new URL(graphqlUrl, window.location.origin)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  return url.toString()
}

const authLink = new ApolloLink((operation, forward) => {
  operation.setContext(
    ({ headers = {} }: { headers?: Record<string, string> }) => {
      if (headers.authorization) return { headers }
      const accessToken = getAccessToken()
      return {
        headers: {
          ...headers,
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
      }
    }
  )

  return forward(operation)
})

export function createApolloClient() {
  const httpLink = from([authLink, new HttpLink({ uri: graphqlUrl })])
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
            connectionParams: () => {
              const accessToken = getAccessToken()
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
