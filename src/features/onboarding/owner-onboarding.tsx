import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { Navigate, useNavigate } from "@tanstack/react-router"
import { CheckCircleIcon, ForkKnifeIcon, UsersThreeIcon } from "@phosphor-icons/react"

import { OvaalMark } from "@/components/ovaal-mark"
import { OnboardingMenuStep } from "@/features/onboarding/components/onboarding-menu-step"
import { OnboardingStaffStep } from "@/features/onboarding/components/onboarding-staff-step"
import { getAccessTokenProfile } from "@/lib/auth-token"

const ONBOARDING_QUERY = gql`
  query OwnerOnboardingRequired {
    ownerOnboardingRequired
  }
`

const COMPLETE_ONBOARDING = gql`
  mutation CompleteOwnerOnboarding {
    completeOwnerOnboarding
  }
`

const steps = [
  { label: "Staff", description: "Add the team, or skip and do it later", icon: UsersThreeIcon },
  { label: "Menu", description: "Put the first dishes on the till", icon: ForkKnifeIcon },
] as const

export function OwnerOnboarding() {
  const navigate = useNavigate()
  const profile = getAccessTokenProfile()
  const { data, loading } = useQuery<{ ownerOnboardingRequired: boolean }>(ONBOARDING_QUERY, {
    skip: profile?.role !== "OWNER",
    fetchPolicy: "network-only",
  })
  const [complete, completeState] = useMutation(COMPLETE_ONBOARDING)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return <Navigate to="/" replace />
  if (profile.role !== "OWNER") return <Navigate to="/overview" replace />
  if (!loading && data && !data.ownerOnboardingRequired) {
    return <Navigate to="/overview" replace />
  }

  async function finish() {
    try {
      setError(null)
      await complete()
      await navigate({ to: "/overview", replace: true })
    } catch {
      setError("We couldn’t finish setup. Try again.")
    }
  }

  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center gap-3">
          <OvaalMark elevated={false} />
          <div>
            <p className="text-sm font-semibold tracking-[-0.02em]">Ovaal</p>
            <p className="text-xs text-muted-foreground">First sign-in for {profile.name}</p>
          </div>
        </div>

        <ol className="mt-8 grid grid-cols-2 gap-3">
          {steps.map((item, index) => {
            const done = index < step
            const now = index === step
            const Icon = item.icon
            return (
              <li key={item.label} className="flex items-center gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${done || now ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {done ? (
                    <CheckCircleIcon aria-hidden="true" className="size-4" weight="fill" />
                  ) : (
                    <Icon aria-hidden="true" className="size-4" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </li>
            )
          })}
        </ol>

        <header className="mt-8">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            {step === 0 ? "Who else works the till?" : "Add the opening menu"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {step === 0
              ? "Add cashiers, kitchen, or a manager. Each person chooses their own PIN the first time they sign in. You can skip this and add them later."
              : "Add at least one category and dish. Prices are in Ghana cedis. Photos and modifiers can wait until the menu page."}
          </p>
        </header>

        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {step === 0 ? (
          <OnboardingStaffStep onContinue={() => setStep(1)} />
        ) : (
          <OnboardingMenuStep
            onBack={() => setStep(0)}
            onContinue={() => {
              if (completeState.loading) return
              void finish()
            }}
          />
        )}
      </div>
    </main>
  )
}
