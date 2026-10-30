import { useEffect, useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useLazyQuery, useMutation } from "@apollo/client/react"
import { useNavigate } from "@tanstack/react-router"
import type { FormikProps } from "formik"
import * as Yup from "yup"
import {
  CheckCircleIcon,
  CopyrightIcon,
  QuestionIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react"
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr"

import { OvaalMark } from "@/components/ovaal-mark"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/content-state"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PinInput } from "@/components/ui/pin-input"
import { StaffRail } from "@/features/auth/staff-rail"
import type { SignInProfile } from "@/features/auth/staff-rail"
import { clearAuthSession, setAuthSession } from "@/lib/auth-token"

function readableAuthError(error: unknown) {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: Array<{ message?: string }> }).errors
    const joined = errors
      ?.map((item) => item.message)
      .filter((message): message is string => Boolean(message))
      .join(" ")
    if (joined) return joined
  }
  return error instanceof Error ? error.message : ""
}

const STAFF_DIRECTORY = gql`
  query StaffDirectory($code: String!) {
    staffDirectory(code: $code) {
      restaurantName
      profiles {
        id
        name
        role
        avatarUrl
        pinSet
      }
    }
  }
`

const LOGIN = gql`
  mutation Login($userId: ID!, $pin: String!) {
    login(userId: $userId, pin: $pin) {
      accessToken
      refreshToken
      user {
        id
        restaurantId
        name
        role
      }
    }
  }
`

const ONBOARDING_QUERY = gql`
  query OwnerOnboardingAfterSignIn {
    ownerOnboardingRequired
  }
`

const SET_STAFF_PIN = gql`
  mutation SetStaffPin($userId: ID!, $pin: String!) {
    setStaffPin(userId: $userId, pin: $pin) {
      accessToken
      refreshToken
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
type Step = "restaurant" | "profiles" | "pin" | "set-pin" | "confirm-pin"

interface AuthUser {
  id: string
  restaurantId: string
  name: string
  role: Role
}

interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface DirectoryData {
  staffDirectory: {
    restaurantName: string
    profiles: SignInProfile[]
  }
}

const loginValues = {
  restaurantCode: "",
  pin: "",
  confirmPin: "",
}

function loginSchema(step: Step) {
  if (step === "restaurant") {
    return Yup.object({
      restaurantCode: Yup.string()
        .trim()
        .required("Enter your restaurant code."),
    })
  }
  if (step === "set-pin") {
    return Yup.object({
      pin: Yup.string()
        .matches(/^\d{4}$/, "Choose a four-digit PIN.")
        .required("Choose a four-digit PIN."),
    })
  }
  if (step === "confirm-pin") {
    return Yup.object({
      confirmPin: Yup.string()
        .matches(/^\d{4}$/, "Enter the same four digits again.")
        .required("Enter the same four digits again.")
        .oneOf([Yup.ref("pin")], "The PINs do not match."),
    })
  }
  if (step === "pin") {
    return Yup.object({
      pin: Yup.string()
        .matches(/^\d{4}$/, "Enter your four-digit PIN.")
        .required("Enter your four-digit PIN."),
    })
  }
  return Yup.object({})
}

const roleLabels: Record<Role, string> = {
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  MANAGER: "Manager",
  OWNER: "Owner",
}

export function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>("restaurant")
  const [restaurantCode, setRestaurantCode] = useState("")
  const [restaurantName, setRestaurantName] = useState("")
  const [profiles, setProfiles] = useState<SignInProfile[]>([])
  const [selected, setSelected] = useState<SignInProfile | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const notice = sessionStorage.getItem("pos.suspended-notice")
    if (!notice) return
    sessionStorage.removeItem("pos.suspended-notice")
    setAuthError(notice)
  }, [])
  const formikRef = useRef<FormikProps<typeof loginValues> | null>(null)
  const [signedInUser, setSignedInUser] = useState<AuthUser | null>(null)
  const [nextPath, setNextPath] = useState<"/overview" | "/onboarding">(
    "/overview"
  )

  const [loadDirectory, directoryState] = useLazyQuery<
    DirectoryData,
    { code: string }
  >(STAFF_DIRECTORY)
  const [login, loginState] = useMutation<
    { login: AuthPayload },
    { userId: string; pin: string }
  >(LOGIN)
  const [setStaffPin, setPinState] = useMutation<
    { setStaffPin: AuthPayload },
    { userId: string; pin: string }
  >(SET_STAFF_PIN)
  const [loadOnboarding] = useLazyQuery<{ ownerOnboardingRequired: boolean }>(
    ONBOARDING_QUERY,
    { fetchPolicy: "network-only" }
  )

  const busy =
    directoryState.loading || loginState.loading || setPinState.loading

  useEffect(() => {
    if (!signedInUser) return
    const id = window.setTimeout(() => {
      navigate({ to: nextPath, replace: true })
    }, 1400)
    return () => window.clearTimeout(id)
  }, [navigate, nextPath, signedInUser])

  async function finishSignIn(payload: AuthPayload) {
    setAuthSession(payload)
    let destination: "/overview" | "/onboarding" = "/overview"
    if (payload.user.role === "OWNER") {
      const result = await loadOnboarding()
      if (result.data?.ownerOnboardingRequired) destination = "/onboarding"
    }
    setNextPath(destination)
    setSignedInUser(payload.user)
  }

  function clearPinFields() {
    const formik = formikRef.current
    void formik?.setFieldValue("pin", "")
    void formik?.setFieldValue("confirmPin", "")
    formik?.setErrors({})
    void formik?.setTouched({})
    setAuthError(null)
  }

  async function submit(values: typeof loginValues) {
    if (step === "restaurant") {
      const trimmed = values.restaurantCode.trim()
      const code = trimmed.length <= 12 ? trimmed.toUpperCase() : trimmed
      setRestaurantCode(code)
      try {
        setAuthError(null)
        const result = await loadDirectory({ variables: { code } })
        if (result.error) throw result.error
        const directory = result.data?.staffDirectory
        if (!directory) throw new Error("Restaurant not found")
        setRestaurantName(directory.restaurantName)
        setProfiles(directory.profiles)
        setStep("profiles")
      } catch (error) {
        const message = readableAuthError(error)
        setAuthError(
          /suspended/i.test(message)
            ? "This restaurant is suspended. Contact the platform team to restore access."
            : /not found/i.test(message)
              ? "We couldn’t find that restaurant. Check the code and try again."
              : "We couldn’t look up that restaurant. Check the code and try again."
        )
      }
      return
    }

    if (!selected) return

    if (step === "set-pin") {
      setAuthError(null)
      void formikRef.current?.setFieldValue("confirmPin", "")
      formikRef.current?.setFieldError("confirmPin", undefined)
      setStep("confirm-pin")
      return
    }

    if (step === "confirm-pin") {
      try {
        setAuthError(null)
        const result = await setStaffPin({
          variables: { userId: selected.id, pin: values.pin },
        })
        const payload = result.data?.setStaffPin
        if (!payload) throw new Error("Missing response")
        await finishSignIn(payload)
      } catch (error) {
        const message = readableAuthError(error)
        setAuthError(
          /suspended/i.test(message)
            ? "This restaurant is suspended. Contact the platform team to restore access."
            : message ||
                "We couldn’t save that PIN. Try a different four digits."
        )
      }
      return
    }

    try {
      setAuthError(null)
      const result = await login({
        variables: { userId: selected.id, pin: values.pin },
      })
      const payload = result.data?.login
      if (!payload) throw new Error("Missing login response")
      await finishSignIn(payload)
    } catch (error) {
      const message = readableAuthError(error)
      setAuthError(
        /suspended/i.test(message)
          ? "This restaurant is suspended. Contact the platform team to restore access."
          : "That PIN doesn’t match this profile. Try again."
      )
    }
  }

  function chooseProfile(profile: SignInProfile) {
    setSelected(profile)
    clearPinFields()
    setStep(profile.pinSet ? "pin" : "set-pin")
  }

  function resetLogin() {
    clearAuthSession()
    setSignedInUser(null)
    setSelected(null)
    setProfiles([])
    setRestaurantName("")
    clearPinFields()
    setStep("restaurant")
  }

  function goBack() {
    if (step === "confirm-pin") {
      void formikRef.current?.setFieldValue("confirmPin", "")
      formikRef.current?.setFieldError("confirmPin", undefined)
      setAuthError(null)
      setStep("set-pin")
      return
    }
    clearPinFields()
    if (step === "pin" || step === "set-pin") {
      setSelected(null)
      setStep("profiles")
      return
    }
    setStep("restaurant")
  }

  const heading =
    step === "restaurant"
      ? "Sign in"
      : step === "profiles"
        ? "Who’s signing in?"
        : step === "set-pin"
          ? "Choose your PIN"
          : step === "confirm-pin"
            ? "Confirm your PIN"
            : "Enter your PIN"

  const description =
    step === "restaurant"
      ? "Enter your restaurant code to see the team."
      : step === "profiles"
        ? `Choose your profile at ${restaurantName || restaurantCode}.`
        : step === "set-pin"
          ? `${selected?.name}, this is your first sign-in. Pick a four-digit PIN you’ll use from now on.`
          : step === "confirm-pin"
            ? `${selected?.name}, enter those four digits again.`
            : `${selected?.name}, enter the four-digit PIN for ${restaurantName || restaurantCode}.`

  return (
    <main className="place-items-left relative grid min-h-svh bg-[url('/auth.jpg')] bg-cover bg-center px-4 py-8 sm:px-6">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      <section className="relative flex min-h-[560px] w-full max-w-lg flex-col rounded-xl bg-card p-5 text-card-foreground sm:p-8">
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
              continueLabel={
                nextPath === "/onboarding" ? "Continue setup" : "Go to overview"
              }
              onContinue={() => navigate({ to: nextPath, replace: true })}
              onReset={resetLogin}
            />
          ) : (
            <div className="w-full">
              <header className="mt-7 text-center">
                <h1 className="text-2xl font-medium tracking-[-0.025em]">
                  {heading}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
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

              <Form
                className="mt-6"
                initialValues={loginValues}
                validationSchema={loginSchema(step)}
                onSubmit={submit}
              >
                {(formik) => {
                  formikRef.current = formik
                  const codeError = fieldError(formik, "restaurantCode")
                  const pinError = fieldError(formik, "pin")
                  const confirmError = fieldError(formik, "confirmPin")
                  return step === "restaurant" ? (
                    <>
                      <FieldGroup className="gap-5">
                        <Field data-invalid={Boolean(codeError)}>
                          <FieldLabel htmlFor="restaurant-id">
                            Restaurant code
                          </FieldLabel>
                          <Input
                            id="restaurant-id"
                            name="restaurantCode"
                            value={formik.values.restaurantCode}
                            onChange={(event) => {
                              formik.handleChange(event)
                              setAuthError(null)
                            }}
                            onBlur={formik.handleBlur}
                            autoComplete="organization"
                            autoCapitalize="characters"
                            spellCheck={false}
                            placeholder="e.g. R0001"
                            aria-invalid={Boolean(codeError)}
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
                              Ask your manager for your restaurant code. It
                              looks like R0001 and was shared when your
                              restaurant was set up.
                            </div>
                          </div>
                          <FieldError id="restaurant-id-error">
                            {codeError}
                          </FieldError>
                        </Field>
                      </FieldGroup>

                      <Button
                        type="submit"
                        className="mt-7 w-full"
                        disabled={busy}
                      >
                        {directoryState.loading ? (
                          <>
                            <SpinnerGapIcon
                              aria-hidden="true"
                              className="animate-spin motion-reduce:animate-none"
                              data-icon="inline-start"
                            />
                            Looking up restaurant…
                          </>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            Continue
                            <CaretRightIcon
                              aria-hidden="true"
                              data-icon="inline-end"
                            />
                          </div>
                        )}
                      </Button>
                    </>
                  ) : step === "profiles" ? (
                    <>
                      {profiles.length === 0 ? (
                        <EmptyState
                          title="No active staff profiles yet."
                          description="An owner needs to add the team before anyone can sign in."
                          action={
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={goBack}
                            >
                              Back
                            </Button>
                          }
                        />
                      ) : (
                        <StaffRail
                          profiles={profiles}
                          onChoose={chooseProfile}
                        />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-4 w-full"
                        onClick={goBack}
                      >
                        Back
                      </Button>
                    </>
                  ) : (
                    <>
                      <FieldGroup className="gap-5">
                        {step === "confirm-pin" ? (
                          <Field data-invalid={Boolean(confirmError)}>
                            <FieldLabel
                              htmlFor="staff-pin-confirm"
                              className="sr-only"
                            >
                              Confirm PIN
                            </FieldLabel>
                            <PinInput
                              id="staff-pin-confirm"
                              value={formik.values.confirmPin}
                              onChange={(value) => {
                                void formik.setFieldValue("confirmPin", value)
                                setAuthError(null)
                              }}
                              invalid={Boolean(confirmError)}
                              autoComplete="new-password"
                            />
                            <FieldError>{confirmError}</FieldError>
                          </Field>
                        ) : (
                          <Field data-invalid={Boolean(pinError)}>
                            <PinInput
                              id="staff-pin"
                              value={formik.values.pin}
                              onChange={(value) => {
                                void formik.setFieldValue("pin", value)
                                setAuthError(null)
                              }}
                              invalid={Boolean(pinError)}
                              autoComplete={
                                step === "set-pin"
                                  ? "new-password"
                                  : "current-password"
                              }
                            />
                            <FieldError>{pinError}</FieldError>
                          </Field>
                        )}
                      </FieldGroup>

                      <Button
                        type="submit"
                        className="mt-7 w-full"
                        disabled={busy}
                      >
                        {busy ? (
                          <>
                            <SpinnerGapIcon
                              aria-hidden="true"
                              className="animate-spin motion-reduce:animate-none"
                              data-icon="inline-start"
                            />
                            {step === "confirm-pin"
                              ? "Saving PIN…"
                              : "Signing in…"}
                          </>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {step === "set-pin"
                              ? "Continue"
                              : step === "confirm-pin"
                                ? "Save PIN and sign in"
                                : "Sign in"}
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
                        disabled={busy}
                      >
                        Back
                      </Button>
                    </>
                  )
                }}
              </Form>
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
      {tagline.lead}{" "}
      <span
        className={
          tagline.accent === "Ovaal"
            ? "font-brand text-primary"
            : "text-primary"
        }
      >
        {tagline.accent}
      </span>
    </p>
  )
}

function SignedIn({
  user,
  continueLabel,
  onContinue,
  onReset,
}: {
  user: AuthUser
  continueLabel: string
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
        You’re signed in as {roleLabels[user.role]}.
        {continueLabel === "Continue setup"
          ? " Next you’ll add your team and opening menu."
          : " Taking you to your workspace now."}
      </p>
      <Button className="mt-6 w-full" onClick={onContinue}>
        {continueLabel}
        <CaretRightIcon aria-hidden="true" data-icon="inline-end" />
      </Button>
      <Button className="mt-2 w-full" variant="ghost" onClick={onReset}>
        Use a different account
      </Button>
    </div>
  )
}
