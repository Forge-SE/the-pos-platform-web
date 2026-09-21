import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  from,
} from "@apollo/client"

import { apolloErrorLink } from "@/lib/apollo-error-link"
import { getAccessToken } from "@/lib/auth-token"

const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL ??
  (import.meta.env.SSR ? "http://localhost:4000/graphql" : "/graphql")

const authLink = new ApolloLink((operation, forward) => {
  const accessToken = getAccessToken()

  operation.setContext(({ headers = {} }: { headers?: HeadersInit }) => ({
    headers: {
      ...headers,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
  }))

  return forward(operation)
})

export function createApolloClient() {
  return new ApolloClient({
    ssrMode: import.meta.env.SSR,
    link: from([apolloErrorLink, authLink, new HttpLink({ uri: graphqlUrl })]),
    cache: new InMemoryCache(),
  })
}
