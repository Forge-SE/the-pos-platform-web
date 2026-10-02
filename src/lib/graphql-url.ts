export const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL ??
  (import.meta.env.SSR ? "http://localhost:4000/graphql" : "/graphql")
