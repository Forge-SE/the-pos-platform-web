import { useState } from "react"
import type { FormEvent } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { Link, useNavigate } from "@tanstack/react-router"

import { OvaalMark } from "@/components/ovaal-mark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setOpsSession } from "@/lib/ops-token"

const ACCEPT = gql`
  mutation AcceptPlatformInvite(
    $token: String!
    $name: String!
    $password: String!
  ) {
    acceptPlatformInvite(token: $token, name: $name, password: $password) {
      accessToken
      refreshToken
    }
  }
`

export function OpsAccept() {
  const navigate = useNavigate()
  const [token] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token")
  )
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [accept, { loading }] = useMutation<{
    acceptPlatformInvite: { accessToken: string; refreshToken: string }
  }>(ACCEPT)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!token) return
    setError(null)
    try {
      const result = await accept({
        variables: { token, name: name.trim(), password },
      })
      if (!result.data?.acceptPlatformInvite) throw new Error("Missing session")
      window.history.replaceState(null, "", window.location.pathname)
      setOpsSession(result.data.acceptPlatformInvite)
      navigate({ to: "/ops", replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be accepted."
      )
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 sm:p-8">
        <OvaalMark />
        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
          Join the operations team
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set your name and password to accept your invitation.
        </p>
        {!token ? (
          <p role="alert" className="mt-6 text-sm text-destructive">
            This invitation link is missing its token. Ask your team admin for a
            new link.
          </p>
        ) : (
          <form
            onSubmit={(event) => void submit(event)}
            className="mt-6 space-y-4"
          >
            <label className="block space-y-1.5 text-sm font-medium">
              Your name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={160}
                autoComplete="name"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Use at least 12 characters.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining…" : "Accept invitation"}
            </Button>
          </form>
        )}
        <Link
          to="/ops/login"
          className="mt-5 inline-block text-sm font-medium text-secondary hover:underline"
        >
          Already joined? Sign in
        </Link>
      </section>
    </main>
  )
}
