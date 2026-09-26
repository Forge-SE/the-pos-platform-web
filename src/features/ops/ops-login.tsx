import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { useNavigate } from "@tanstack/react-router"
import * as Yup from "yup"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { setOpsToken } from "@/lib/ops-token"

const opsLoginValues = { email: "", password: "" }

const opsLoginSchema = Yup.object({
  email: Yup.string().trim().required("Enter your admin email and password."),
  password: Yup.string().required("Enter your admin email and password."),
})

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
  const [error, setError] = useState<string | null>(null)
  const [login, { loading }] = useMutation<
    { platformAdminLogin: { token: string } },
    { email: string; password: string }
  >(OPS_LOGIN)

  async function submit(values: typeof opsLoginValues) {
    try {
      setError(null)
      const result = await login({
        variables: { email: values.email.trim(), password: values.password },
      })
      const token = result.data?.platformAdminLogin.token
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
        <Form
          className="mt-6"
          initialValues={opsLoginValues}
          validationSchema={opsLoginSchema}
          onSubmit={submit}
        >
          {(formik) => {
            const emailError = fieldError(formik, "email")
            const passwordError = fieldError(formik, "password")
            return (
              <>
                <FieldGroup className="gap-5">
                  <Field data-invalid={Boolean(emailError)}>
                    <FieldLabel htmlFor="ops-email">Email</FieldLabel>
                    <Input
                      id="ops-email"
                      name="email"
                      type="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete="username"
                      aria-invalid={Boolean(emailError)}
                      autoFocus
                    />
                    <FieldError>{emailError}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(passwordError)}>
                    <FieldLabel htmlFor="ops-password">Password</FieldLabel>
                    <Input
                      id="ops-password"
                      name="password"
                      type="password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete="current-password"
                      aria-invalid={Boolean(passwordError)}
                    />
                    <FieldError>{passwordError}</FieldError>
                  </Field>
                </FieldGroup>
                <Button
                  type="submit"
                  className="mt-7 w-full"
                  disabled={loading}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </>
            )
          }}
        </Form>
      </section>
    </main>
  )
}
