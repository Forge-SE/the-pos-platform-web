import { ApolloProvider } from "@apollo/client/react"
import { useState } from "react"
import type { ReactNode } from "react"

import { createApolloClient } from "@/lib/apollo-client"
import { ToastProvider } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"

export function Providers({ children }: { children: ReactNode }) {
  const [apolloClient] = useState(createApolloClient)

  return (
    <ApolloProvider client={apolloClient}>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ApolloProvider>
  )
}
