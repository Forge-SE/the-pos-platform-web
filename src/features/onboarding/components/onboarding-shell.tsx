import {
  CheckCircleIcon,
  DeviceMobileIcon,
  ForkKnifeIcon,
  SlidersHorizontalIcon,
  StorefrontIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

export interface OnboardingStep {
  label: string
  description: string
  icon: Icon
}

export const onboardingSteps: OnboardingStep[] = [
  {
    label: "Restaurant",
    description: "Identity and service style",
    icon: StorefrontIcon,
  },
  {
    label: "Owner access",
    description: "Primary operator and PIN",
    icon: UserIcon,
  },
  {
    label: "Operations",
    description: "Approval and cash controls",
    icon: SlidersHorizontalIcon,
  },
  {
    label: "Review",
    description: "Confirm and create workspace",
    icon: CheckCircleIcon,
  },
]

export const ownerOnboardingSteps: OnboardingStep[] = [
  ...onboardingSteps,
  {
    label: "Menu",
    description: "Opening dishes and prices",
    icon: ForkKnifeIcon,
  },
  {
    label: "Staff",
    description: "People who use the till",
    icon: UsersThreeIcon,
  },
  {
    label: "Payouts",
    description: "Where MoMo payments land",
    icon: DeviceMobileIcon,
  },
]

export function OnboardingShell({
  currentStep,
  steps = onboardingSteps,
  children,
}: {
  currentStep: number
  steps?: OnboardingStep[]
  children: React.ReactNode
}) {
  return (
    <main className="min-h-svh bg-background px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-2.5 text-foreground sm:mb-10">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ForkKnifeIcon
              aria-hidden="true"
              className="size-5"
              weight="bold"
            />
          </span>
          <span className="text-lg font-bold tracking-[-0.025em]">
            POS Platform
          </span>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[16rem_minmax(0,36rem)] lg:justify-center lg:gap-14">
          <aside
            className="hidden lg:block"
            aria-label="Restaurant setup progress"
          >
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              Restaurant setup
            </p>
            <ol className="mt-5 space-y-1">
              {steps.map((item, index) => {
                const IconComponent = item.icon
                const active = currentStep === index
                const complete = currentStep > index
                return (
                  <li
                    key={item.label}
                    className="relative flex min-h-16 items-start gap-3 rounded-lg p-3"
                    aria-current={active ? "step" : undefined}
                  >
                    <span
                      className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[complete=true]:border-primary/20 data-[complete=true]:bg-primary/10 data-[complete=true]:text-primary"
                      data-active={active}
                      data-complete={complete}
                    >
                      {complete ? (
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-4"
                          weight="fill"
                        />
                      ) : (
                        <IconComponent aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute top-11 bottom-[-1rem] left-[1.72rem] w-px bg-border"
                      />
                    )}
                    <span className="min-w-0 pt-0.5">
                      <span
                        className="block text-sm font-semibold data-[active=false]:text-muted-foreground"
                        data-active={active || complete}
                      >
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>
            <p className="mt-7 max-w-56 text-xs leading-5 text-muted-foreground">
              Setup access is managed by your platform administrator.
            </p>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </main>
  )
}
