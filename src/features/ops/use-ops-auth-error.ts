import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"

import { clearOpsToken } from "@/lib/ops-token"

export function useOpsAuthError(error: unknown) {
  const navigate = useNavigate()

  useEffect(() => {
    if (
      error &&
      typeof error === "object" &&
      "graphQLErrors" in error &&
      Array.isArray((error as { graphQLErrors: unknown[] }).graphQLErrors) &&
      (
        error as { graphQLErrors: { extensions?: { code?: string } }[] }
      ).graphQLErrors.some(
        (entry) =>
          entry.extensions?.code === "UNAUTHENTICATED" ||
          entry.extensions?.code === "FORBIDDEN",
      )
    ) {
      clearOpsToken()
      navigate({ to: "/ops/login" })
    }
  }, [error, navigate])
}
