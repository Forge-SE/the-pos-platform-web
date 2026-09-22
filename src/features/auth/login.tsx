import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { useNavigate } from "@tanstack/react-router"
import {
  CheckCircleIcon,
  CopyrightIcon,
  QuestionIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { OvaalMark } from "@/components/ovaal-mark"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PinInput } from "@/components/ui/pin-input"
import { clearAccessToken, setAccessToken } from "@/lib/auth-token"
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr"

const LOGIN = gql`
  mutation Login($restaurantId: ID!, $pin: String!) {
    login(restaurantId: $restaurantId, pin: $pin) {
      token
      user {
        id
        restaurantId
        name
        role
      }
    }
  }
`

type Role = "CASHIER" | "KITCHEN" | "MANAGER" | "OWNER"

interface LoginResult {
  login: {
    token: string
    user: {
      id: string
      restaurantId: string
      name: string
      role: Role
    }
  }
}

interface LoginVariables {
  restaurantId: string
  pin: string
}

const roleLabels: Record<Role, string> = {
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  MANAGER: "Manager",
  OWNER: "Owner",
}

export function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<"restaurant" | "pin">("restaurant")
  const [restaurantId, setRestaurantId] = useState("")
  const [pin, setPin] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    restaurantId?: string
    pin?: string
  }>({})
  const [authError, setAuthError] = useState<string | null>(null)
  const [signedInUser, setSignedInUser] = useState<
    LoginResult["login"]["user"] | null
  >(null)

  const [login, { loading }] = useMutation<LoginResult, LoginVariables>(LOGIN)

  useEffect(() => {
    if (!signedInUser) return
    const id = window.setTimeout(() => {
      navigate({ to: "/overview", replace: true })
    }, 1400)
    return () => window.clearTimeout(id)
  }, [navigate, signedInUser])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (step === "restaurant") {
      if (!restaurantId.trim()) {
        setFieldErrors({ restaurantId: "Enter your restaurant code." })
        setAuthError(null)
        return
      }
      setFieldErrors({})
      setAuthError(null)
      // Short codes are case-insensitive; UUIDs pass through untouched.
      const trimmed = restaurantId.trim()
      if (trimmed.length <= 12) setRestaurantId(trimmed.toUpperCase())
      else setRestaurantId(trimmed)
      setStep("pin")
      return
    }

    if (!/^\d{4}$/.test(pin)) {
      setFieldErrors({ pin: "Enter your four-digit PIN." })
      setAuthError(null)
      return
    }

    try {
      setFieldErrors({})
      setAuthError(null)
      const result = await login({
        variables: { restaurantId: restaurantId.trim(), pin },
      })
      const payload = result.data?.login
      if (!payload) throw new Error("Missing login response")
      setAccessToken(payload.token)
      setSignedInUser(payload.user)
    } catch {
      setAuthError(
        "We couldn’t sign you in. Check your restaurant code and PIN, then try again."
      )
    }
  }

  function resetLogin() {
    clearAccessToken()
    setSignedInUser(null)
    setPin("")
    setAuthError(null)
    setStep("restaurant")
  }

  function goBack() {
    setPin("")
    setFieldErrors({})
    setAuthError(null)
    setStep("restaurant")
  }

  return (
    <main className="place-items-left relative grid min-h-svh bg-[url('/auth.jpg')] bg-cover bg-center px-4 py-8 sm:px-6">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      <section className="relative flex min-h-[560px] w-full max-w-md flex-col rounded-xl bg-card p-5 text-card-foreground sm:p-8">
        <div className="flex justify-end">
          <a
            href="mailto:support@ovaal.app"
            className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Contact support
          </a>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <OvaalMark />

          {signedInUser ? (
            <SignedIn
              user={signedInUser}
              onContinue={() => navigate({ to: "/overview", replace: true })}
              onReset={resetLogin}
            />
          ) : (
            <div className="w-full">
              <header className="mt-7 text-center">
                <h1 className="text-2xl font-medium tracking-[-0.025em]">
                  {step === "restaurant" ? "Sign in" : "Enter your PIN"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step === "restaurant"
                    ? "Enter your restaurant code to continue."
                    : `Signing in to ${restaurantId.trim()}. Enter your four-digit PIN.`}
                </p>
              </header>

              {authError && (
                <div
                  role="alert"
                  className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
                >
                  {authError}
                </div>
              )}

              <form className="mt-6" onSubmit={submit} noValidate>
                {step === "restaurant" ? (
                  <>
                    <FieldGroup className="gap-5">
                      <Field data-invalid={Boolean(fieldErrors.restaurantId)}>
                        <FieldLabel htmlFor="restaurant-id">
                          Restaurant code
                        </FieldLabel>
                        <Input
                          id="restaurant-id"
                          value={restaurantId}
                          onChange={(event) => {
                            setRestaurantId(event.target.value)
                            setFieldErrors((current) => ({
                              ...current,
                              restaurantId: undefined,
                            }))
                            setAuthError(null)
                          }}
                          autoComplete="organization"
                          autoCapitalize="characters"
                          spellCheck={false}
                          placeholder="e.g. RR0093"
                          aria-invalid={Boolean(fieldErrors.restaurantId)}
                          aria-describedby="restaurant-id-error"
                          autoFocus
                        />
                        <div className="group relative mt-1 flex justify-end">
                          <button
                            type="button"
                            aria-describedby="restaurant-id-help"
                            className="inline-flex items-center gap-1 rounded text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <QuestionIcon
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            Don&apos;t know your restaurant code?
                          </button>
                          <div
                            role="tooltip"
                            id="restaurant-id-help"
                            className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 w-60 rounded-md border bg-popover p-2.5 text-xs leading-5 text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
                          >
                            Ask your manager for your restaurant code. It looks
                            like AB1234 and was shared when your restaurant was
                            set up.
                          </div>
                        </div>
                        <FieldError id="restaurant-id-error">
                          {fieldErrors.restaurantId}
                        </FieldError>
                      </Field>
                    </FieldGroup>

                    <Button type="submit" className="mt-7 w-full">
                      <div className="flex items-center justify-center gap-2">
                        Continue
                        <CaretRightIcon
                          aria-hidden="true"
                          data-icon="inline-end"
                        />
                      </div>
                    </Button>
                  </>
                ) : (
                  <>
                    <FieldGroup className="gap-5">
                      <Field data-invalid={Boolean(fieldErrors.pin)}>
                        <PinInput
                          id="staff-pin"
                          value={pin}
                          onChange={(value) => {
                            setPin(value)
                            setFieldErrors((current) => ({
                              ...current,
                              pin: undefined,
                            }))
                            setAuthError(null)
                          }}
                          invalid={Boolean(fieldErrors.pin)}
                        />
                        <FieldError>{fieldErrors.pin}</FieldError>
                      </Field>
                    </FieldGroup>

                    <Button
                      type="submit"
                      className="mt-7 w-full"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <SpinnerGapIcon
                            aria-hidden="true"
                            className="animate-spin motion-reduce:animate-none"
                            data-icon="inline-start"
                          />
                          Signing in…
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          Sign in
                          <CaretRightIcon
                            aria-hidden="true"
                            data-icon="inline-end"
                          />
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 w-full"
                      onClick={goBack}
                      disabled={loading}
                    >
                      Back
                    </Button>
                  </>
                )}
              </form>
            </div>
          )}
        </div>
        <p className="w-full pt-6 text-center text-xs leading-5 text-muted-foreground">
          By signing in, you agree to our{" "}
          <a
            href="/terms"
            className="font-medium text-[#1F4D2E] underline-offset-4 hover:underline dark:text-primary"
          >
            Terms of Use
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="font-medium text-[#1F4D2E] underline-offset-4 hover:underline dark:text-primary"
          >
            Privacy Policy
          </a>
          .
        </p>
      </section>
      <div className="absolute right-6 bottom-6 left-6 z-10 flex items-end justify-between gap-6 sm:right-10 sm:bottom-8 sm:left-auto sm:max-w-sm sm:flex-col sm:items-end sm:gap-3 sm:text-right">
        <RotatingTagline />
        <p className="flex shrink-0 items-center gap-1 text-xs text-white/70">
          <CopyrightIcon aria-hidden="true" className="size-3.5" />
          {new Date().getFullYear()}. Powered by{" "}
          <a
            href="https://www.forgestudios.tech"
            target="_blank"
            rel="noreferrer"
            className="text-white underline-offset-4 hover:underline"
          >
            Forge Studios
          </a>
        </p>
      </div>
    </main>
  )
}

const taglines = [
  {
    lead: "A new era of restaurant management with",
    accent: "Ovaal",
  },
  {
    lead: "Orders, revenue, operations —",
    accent: "all in sync.",
  },
]

function RotatingTagline() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % taglines.length)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  const tagline = taglines[index]

  return (
    <p
      key={index}
      aria-live="polite"
      className="animate-tagline-reveal font-heading text-xl leading-tight font-medium text-white drop-shadow-md sm:text-2xl"
    >
      {tagline.lead} <span className="text-primary">{tagline.accent}</span>
    </p>
  )
}

function SignedIn({
  user,
  onContinue,
  onReset,
}: {
  user: LoginResult["login"]["user"]
  onContinue: () => void
  onReset: () => void
}) {
  return (
    <div className="mt-7 text-center" role="status">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircleIcon aria-hidden="true" className="size-6" weight="fill" />
      </span>
      <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        Signed in
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
        Welcome, {user.name}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        You’re signed in as {roleLabels[user.role]}. Taking you to your
        workspace now.
      </p>
      <Button className="mt-6 w-full" onClick={onContinue}>
        Go to overview
        <CaretRightIcon aria-hidden="true" data-icon="inline-end" />
      </Button>
      <Button className="mt-2 w-full" variant="ghost" onClick={onReset}>
        Use a different account
      </Button>
    </div>
  )
}
