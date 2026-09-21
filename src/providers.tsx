import { ApolloProvider } from "@apollo/client/react"
import { useState } from "react"
import type { ReactNode } from "react"

import { createApolloClient } from "@/lib/apollo-client"

export function Providers({ children }: { children: ReactNode }) {
  const [apolloClient] = useState(createApolloClient)

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
}
