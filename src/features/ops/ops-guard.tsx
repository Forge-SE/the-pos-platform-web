import { useEffect, useState } from "react"
import type { ReactNode } from "react"

import { NotFoundPage } from "@/app/root-document"
import {
  OPS_TOKEN_CHANGED_EVENT,
  isOpsAuthenticated,
} from "@/lib/ops-token"

export function OpsGuard({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setAllowed(isOpsAuthenticated())
    check()
    window.addEventListener(OPS_TOKEN_CHANGED_EVENT, check)
    window.addEventListener("storage", check)
    return () => {
      window.removeEventListener(OPS_TOKEN_CHANGED_EVENT, check)
      window.removeEventListener("storage", check)
    }
  }, [])

  if (allowed === null) return null
  // Masquerade as 404 so the internal area doesn't admit it exists.
  if (!allowed) return <NotFoundPage />
  return <>{children}</>
}
