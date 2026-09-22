import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { setOpsToken } from "@/lib/ops-token"

const OPS_LOGIN = gql`
  mutation PlatformAdminLogin($email: String!, $password: String!) {
    platformAdminLogin(email: $email, password: $password) {
      token
      user {
        id
        name
        role
      }
    }
  }
`

export function OpsLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [login, { loading }] = useMutation<
    { platformAdminLogin: { token: string } },
    { email: string; password: string }
  >(OPS_LOGIN)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError("Enter your admin email and password.")
      return
    }
    try {
      setError(null)
      const result = await login({
        variables: { email: email.trim(), password },
      })
      const token = result.data?.platformAdminLogin?.token
      if (!token) throw new Error("Missing login response")
      setOpsToken(token)
      navigate({ to: "/ops" })
    } catch {
      setError("Invalid admin credentials.")
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-8">
      <section className="w-full max-w-sm rounded-xl border bg-card p-6 text-card-foreground sm:p-8">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Internal
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-[-0.025em]">
          Platform admin
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Restricted area. Activity here is logged.
        </p>
        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        <form className="mt-6" onSubmit={submit} noValidate>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="ops-email">Email</FieldLabel>
              <Input
                id="ops-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ops-password">Password</FieldLabel>
              <Input
                id="ops-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" className="mt-7 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  )
}
