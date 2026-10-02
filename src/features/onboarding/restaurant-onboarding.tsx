import { useEffect, useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import type { FormikHelpers, FormikProps } from "formik"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import Form, { fieldError } from "@/components/ui/form"
import { setAuthSession } from "@/lib/auth-token"
import { opsAuthContext } from "@/lib/ops-token"

import { OnboardingComplete } from "./components/onboarding-complete"
import { OnboardingMenuStep } from "./components/onboarding-menu-step"
import { OnboardingPayoutsStep } from "./components/onboarding-payouts-step"
import { OnboardingReviewStep } from "./components/onboarding-review-step"
import { OnboardingStaffStep } from "./components/onboarding-staff-step"
import {
  OnboardingShell,
  onboardingSteps,
  ownerOnboardingSteps,
} from "./components/onboarding-shell"
import { OperatingControlsStep } from "./components/operating-controls-step"
import { OwnerAccessStep } from "./components/owner-access-step"
import { RestaurantProfileStep } from "./components/restaurant-profile-step"
import {
  initialOnboardingValues,
  onboardingStepSchema,
  toPlatformSetupInput,
  toSetupRestaurantInput,
  validateOnboardingStep,
} from "./onboarding-contract"
import type {
  DiningType,
  OnboardingErrors,
  OnboardingField,
  PlatformSetupRestaurantInput,
  RestaurantOnboardingValues,
  SetupRestaurantInput,
} from "./onboarding-contract"

const SETUP_RESTAURANT = gql`
  mutation SetupRestaurant($input: SetupRestaurantInput!) {
    setupRestaurant(input: $input) {
      accessToken
      refreshToken
      restaurant {
        id
        name
        slug
        code
        currency
        timezone
        defaultDiningType
      }
      user {
        id
        name
        role
      }
    }
  }
`

interface SetupRestaurantResult {
  setupRestaurant: {
    accessToken: string
    refreshToken: string
    restaurant: {
      id: string
      name: string
      slug: string
      code: string
      currency: string
      timezone: string
      defaultDiningType: DiningType
    }
    user: {
      id: string
      name: string
      role: "OWNER"
    }
  }
}

const PLATFORM_SETUP_RESTAURANT = gql`
  mutation PlatformSetupRestaurant($input: PlatformSetupRestaurantInput!) {
    platformSetupRestaurant(input: $input) {
      restaurant {
        id
        name
        slug
        code
        currency
        timezone
      }
      user {
        id
        name
        role
      }
    }
  }
`

export interface ProvisionedRestaurant {
  restaurant: {
    id: string
    name: string
    slug: string
    code: string
    currency: string
    timezone: string
  }
  user: {
    id: string
    name: string
    role: string
  }
}

interface SetupMutationResult {
  setupRestaurant?: SetupRestaurantResult["setupRestaurant"]
  platformSetupRestaurant?: ProvisionedRestaurant
}

interface SetupMutationVariables {
  input: SetupRestaurantInput | PlatformSetupRestaurantInput
}

const stepCopy = [
  {
    eyebrow: "Restaurant profile",
    title: "Tell us about the restaurant",
    description:
      "This name appears on the till, kitchen tickets, receipts, and owner reports.",
  },
  {
    eyebrow: "Owner access",
    title: "Create the first operator",
    description:
      "The owner account can manage staff, menus, discounts, and daily reconciliation.",
  },
  {
    eyebrow: "Operating controls",
    title: "Set the opening guardrails",
    description:
      "Choose when manager approval is required and how much cash variance should be flagged.",
  },
  {
    eyebrow: "Final review",
    title: "Ready to create the workspace",
    description:
      "Review the operating profile before the restaurant and owner account are created.",
  },
  {
    eyebrow: "Opening menu",
    title: "Put the first dishes on the till",
    description:
      "Add at least one category and dish. Prices are in Ghana cedis. You can add photos and modifiers after setup.",
  },
  {
    eyebrow: "Staff",
    title: "Add the people on the till",
    description:
      "Profiles show up on the sign-in screen. Each person sets their own PIN the first time they sign in.",
  },
  {
    eyebrow: "Payouts",
    title: "Where should MoMo payments land?",
    description:
      "Add every mobile money number that should receive money. MTN, AirtelTigo, and Telecel can all be saved, and you can add more than one.",
  },
]

const onboardingFields = [
  "setupSecret",
  "name",
  "slug",
  "ownerName",
  "ownerPin",
  "confirmOwnerPin",
  "managerDiscountThresholdPercent",
  "reconciliationVarianceGhs",
] as const satisfies readonly OnboardingField[]

function shownOnboardingErrors(
  formik: FormikProps<RestaurantOnboardingValues>
): OnboardingErrors {
  const errors: OnboardingErrors = {}
  for (const field of onboardingFields) {
    const message = fieldError(formik, field)
    if (message) errors[field] = message
  }
  return errors
}

export interface RestaurantOnboardingProps {
  mode?: "public" | "platform"
  onCompleted?: (payload: ProvisionedRestaurant) => void
}

export function RestaurantOnboarding({
  mode = "public",
  onCompleted,
}: RestaurantOnboardingProps = {}) {
  const isPlatform = mode === "platform"
  const steps = isPlatform ? onboardingSteps : ownerOnboardingSteps
  const [step, setStep] = useState(0)
  const [slugEdited, setSlugEdited] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<
    SetupRestaurantResult["setupRestaurant"] | null
  >(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const [setupRestaurant, { loading }] = useMutation<
    SetupMutationResult,
    SetupMutationVariables
  >(isPlatform ? PLATFORM_SETUP_RESTAURANT : SETUP_RESTAURANT)

  useEffect(() => {
    titleRef.current?.focus()
  }, [step])

  function previousStep() {
    setApiError(null)
    setStep((current) => Math.max(current - 1, 0))
  }

  async function submitOnboarding(
    values: RestaurantOnboardingValues,
    helpers: FormikHelpers<RestaurantOnboardingValues>
  ) {
    if (step < onboardingSteps.length - 1) {
      setStep((current) => Math.min(current + 1, steps.length - 1))
      return
    }

    const allErrors = [0, 1, 2].reduce<OnboardingErrors>(
      (result, currentStep) => ({
        ...result,
        ...validateOnboardingStep(currentStep, values, {
          setupSecretRequired: !isPlatform,
        }),
      }),
      {}
    )

    if (Object.keys(allErrors).length) {
      const firstInvalidStep = [0, 1, 2].find(
        (currentStep) =>
          Object.keys(
            validateOnboardingStep(currentStep, values, {
              setupSecretRequired: !isPlatform,
            })
          ).length
      )
      if (firstInvalidStep !== undefined) setStep(firstInvalidStep)
      const stepErrors =
        firstInvalidStep === undefined
          ? allErrors
          : validateOnboardingStep(firstInvalidStep, values, {
              setupSecretRequired: !isPlatform,
            })
      void helpers.setTouched(
        Object.fromEntries(Object.keys(stepErrors).map((key) => [key, true])),
        false
      )
      helpers.setErrors(stepErrors)
      requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }

    try {
      setApiError(null)
      if (isPlatform) {
        const result = await setupRestaurant({
          variables: { input: toPlatformSetupInput(values) },
          context: opsAuthContext(),
        })
        const payload = result.data?.platformSetupRestaurant
        if (!payload)
          throw new Error("The setup service returned no restaurant.")
        if (onCompleted) {
          onCompleted(payload)
          return
        }
        setCompleted({
          accessToken: "",
          refreshToken: "",
          restaurant: {
            ...payload.restaurant,
            defaultDiningType: "TAKEAWAY",
          },
          user: { ...payload.user, role: "OWNER" },
        })
        return
      }
      const result = await setupRestaurant({
        variables: { input: toSetupRestaurantInput(values) },
      })
      const payload = result.data?.setupRestaurant
      if (!payload) throw new Error("The setup service returned no restaurant.")
      setAuthSession(payload)
      setStep(4)
      setCompleted(payload)
      return
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "We couldn’t create the restaurant. Try again."
      )
      requestAnimationFrame(() => errorSummaryRef.current?.focus())
    }
  }

  if (completed && (isPlatform || step > 6)) {
    return <OnboardingComplete result={completed} steps={steps} />
  }

  const copy = {
    ...stepCopy[step],
    description:
      !isPlatform && step === 3
        ? "Create the workspace, then add the opening menu, staff profiles, and the mobile money numbers that receive payments."
        : stepCopy[step].description,
  }
  return (
    <OnboardingShell currentStep={step} steps={steps}>
      <section className="rounded-xl bg-card p-5 text-card-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.04),0_12px_32px_oklch(0.18_0.03_150/0.08)] sm:p-8">
        <div className="lg:hidden">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-primary">
              Step {step + 1} of {steps.length}
            </span>
            <span className="text-muted-foreground">{steps[step].label}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
              style={{
                width: `${((step + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <header className="mt-7 lg:mt-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {copy.eyebrow}
          </p>
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="mt-2 text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.025em] text-balance outline-none"
          >
            {copy.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-pretty text-muted-foreground">
            {copy.description}
          </p>
        </header>

        {step === 4 && <OnboardingMenuStep onContinue={() => setStep(5)} />}
        {step === 5 && (
          <OnboardingStaffStep
            onBack={() => setStep(4)}
            onContinue={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <OnboardingPayoutsStep
            onBack={() => setStep(5)}
            onFinish={() => setStep(7)}
            finishing={false}
          />
        )}

        {step <= 3 && (
          <Form
            className="mt-7"
            initialValues={initialOnboardingValues}
            validationSchema={onboardingStepSchema(step, {
              setupSecretRequired: !isPlatform,
            })}
            onSubmit={submitOnboarding}
          >
            {(formik) => {
              const errors = shownOnboardingErrors(formik)
              const visibleErrors = Object.entries(errors).filter(
                ([, message]) => message
              )
              const updateField = <TField extends OnboardingField>(
                field: TField,
                value: RestaurantOnboardingValues[TField]
              ) => {
                void formik.setFieldValue(field, value)
                setApiError(null)
              }
              const stepProps = { values: formik.values, errors, updateField }

              return (
                <>
                  {(visibleErrors.length > 0 || apiError) && (
                    <div
                      ref={errorSummaryRef}
                      tabIndex={-1}
                      role="alert"
                      className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-destructive/20"
                    >
                      <p className="font-semibold text-destructive">
                        {apiError ?? "Review the highlighted fields."}
                      </p>
                      {!apiError && visibleErrors.length > 1 && (
                        <p className="mt-1 text-muted-foreground">
                          {visibleErrors.length} fields need your attention.
                        </p>
                      )}
                    </div>
                  )}
                  {step === 0 && (
                    <RestaurantProfileStep
                      {...stepProps}
                      slugEdited={slugEdited}
                      onSlugEdited={() => setSlugEdited(true)}
                    />
                  )}
                  {step === 1 && <OwnerAccessStep {...stepProps} />}
                  {step === 2 && (
                    <OperatingControlsStep
                      {...stepProps}
                      hideSetupSecret={isPlatform}
                    />
                  )}
                  {step === 3 && (
                    <OnboardingReviewStep
                      values={formik.values}
                      onEdit={setStep}
                    />
                  )}

                  <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={previousStep}
                      disabled={step === 0 || loading}
                      className={step === 0 ? "invisible" : undefined}
                    >
                      <ArrowLeftIcon
                        aria-hidden="true"
                        data-icon="inline-start"
                      />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="min-w-32"
                    >
                      {loading ? (
                        <>
                          <SpinnerGapIcon
                            aria-hidden="true"
                            className="animate-spin motion-reduce:animate-none"
                            data-icon="inline-start"
                          />
                          Creating…
                        </>
                      ) : step === 3 ? (
                        isPlatform ? (
                          "Create restaurant"
                        ) : (
                          "Create and continue"
                        )
                      ) : (
                        <>
                          Continue
                          <ArrowRightIcon
                            aria-hidden="true"
                            data-icon="inline-end"
                          />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )
            }}
          </Form>
        )}
      </section>
    </OnboardingShell>
  )
}
