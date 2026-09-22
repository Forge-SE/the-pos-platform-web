import { CheckCircleIcon } from "@phosphor-icons/react"

import { ReviewRow } from "./onboarding-fields"
import { OnboardingShell, onboardingSteps } from "./onboarding-shell"

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
}: {
  result: CompletedRestaurant
}) {
  return (
    <OnboardingShell currentStep={onboardingSteps.length}>
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
          The restaurant workspace and owner account are active. Your secure
          session has been saved on this device.
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

        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Next in setup</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Add staff PINs, create menu categories, then add items and
            modifiers. Those steps use the authenticated setup contracts.
          </p>
        </div>
      </section>
    </OnboardingShell>
  )
}
