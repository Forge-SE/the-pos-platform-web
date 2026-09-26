import { useNavigate } from "@tanstack/react-router"
import { CheckCircleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

import { ReviewRow } from "./onboarding-fields"
import { OnboardingShell, onboardingSteps } from "./onboarding-shell"
import type { OnboardingStep } from "./onboarding-shell"

interface CompletedRestaurant {
  restaurant: {
    name: string
    slug: string
    code?: string
    currency: string
    timezone: string
  }
  user: {
    name: string
  }
}

export function OnboardingComplete({
  result,
  steps = onboardingSteps,
}: {
  result: CompletedRestaurant
  steps?: OnboardingStep[]
}) {
  const navigate = useNavigate()
  return (
    <OnboardingShell currentStep={steps.length} steps={steps}>
      <section className="rounded-xl bg-card p-6 text-card-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.04),0_12px_32px_oklch(0.18_0.03_150/0.08)] sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircleIcon
            aria-hidden="true"
            className="size-7"
            weight="fill"
          />
        </div>
        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Setup complete
        </p>
        <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-[-0.025em] text-balance">
          {result.restaurant.name} is ready
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-pretty text-muted-foreground">
          The workspace is active and this device is signed in as the owner.
          Staff choose their own PIN the first time they tap their profile on
          the till.
        </p>

        <dl className="mt-7 divide-y divide-border rounded-lg border bg-muted/20 px-4">
          <ReviewRow label="Workspace" value={result.restaurant.slug} />
          {result.restaurant.code && (
            <ReviewRow label="Login code" value={result.restaurant.code} />
          )}
          <ReviewRow label="Owner" value={result.user.name} />
          <ReviewRow
            label="Operating region"
            value={`${result.restaurant.currency} · ${result.restaurant.timezone}`}
          />
        </dl>

        <Button className="mt-6" onClick={() => navigate({ to: "/overview" })}>
          Go to your workspace
        </Button>
      </section>
    </OnboardingShell>
  )
}
