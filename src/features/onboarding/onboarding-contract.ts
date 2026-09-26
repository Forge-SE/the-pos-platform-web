import * as Yup from "yup"

export type DiningType = "DINE_IN" | "TAKEAWAY"

export interface RestaurantOnboardingValues {
  setupSecret: string
  name: string
  slug: string
  ownerName: string
  ownerPin: string
  confirmOwnerPin: string
  defaultDiningType: DiningType
  managerDiscountThresholdPercent: string
  reconciliationVarianceGhs: string
}

export interface SetupRestaurantInput {
  setupSecret: string
  name: string
  slug: string
  ownerName: string
  ownerPin: string
  defaultDiningType: DiningType
  managerDiscountThresholdBps: number
  reconciliationVarianceThreshold: number
}

export interface PlatformSetupRestaurantInput {
  name: string
  slug: string
  ownerName: string
  ownerPin: string
  defaultDiningType: DiningType
  managerDiscountThresholdBps: number
  reconciliationVarianceThreshold: number
}

export const initialOnboardingValues: RestaurantOnboardingValues = {
  setupSecret: "",
  name: "",
  slug: "",
  ownerName: "",
  ownerPin: "",
  confirmOwnerPin: "",
  defaultDiningType: "TAKEAWAY",
  managerDiscountThresholdPercent: "0",
  reconciliationVarianceGhs: "0",
}

export function restaurantSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function percentToBasisPoints(value: string) {
  return Math.round(Number(value) * 100)
}

export function cedisToPesewas(value: string) {
  return Math.round(Number(value) * 100)
}

export function toSetupRestaurantInput(
  values: RestaurantOnboardingValues
): SetupRestaurantInput {
  return {
    setupSecret: values.setupSecret,
    ...toPlatformSetupInput(values),
  }
}

export function toPlatformSetupInput(
  values: RestaurantOnboardingValues
): PlatformSetupRestaurantInput {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    ownerName: values.ownerName.trim(),
    ownerPin: values.ownerPin,
    defaultDiningType: values.defaultDiningType,
    managerDiscountThresholdBps: percentToBasisPoints(
      values.managerDiscountThresholdPercent
    ),
    reconciliationVarianceThreshold: cedisToPesewas(
      values.reconciliationVarianceGhs
    ),
  }
}

export type OnboardingField = keyof RestaurantOnboardingValues
export type OnboardingErrors = Partial<Record<OnboardingField, string>>

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function onboardingStepSchema(
  step: number,
  options?: { setupSecretRequired?: boolean },
) {
  if (step === 0) {
    return Yup.object({
      name: Yup.string()
        .trim()
        .min(2, "Enter the restaurant name.")
        .required("Enter the restaurant name."),
      slug: Yup.string()
        .matches(
          slugPattern,
          "Use lowercase letters, numbers, and single hyphens.",
        )
        .required("Use lowercase letters, numbers, and single hyphens."),
    })
  }

  if (step === 1) {
    return Yup.object({
      ownerName: Yup.string()
        .trim()
        .min(2, "Enter the owner’s name.")
        .required("Enter the owner’s name."),
      ownerPin: Yup.string()
        .matches(/^\d{4}$/, "Enter a four-digit PIN.")
        .required("Enter a four-digit PIN."),
      confirmOwnerPin: Yup.string()
        .required("The PINs do not match.")
        .oneOf([Yup.ref("ownerPin")], "The PINs do not match."),
    })
  }

  if (step === 2) {
    const shape: Record<string, Yup.AnySchema> = {
      managerDiscountThresholdPercent: Yup.string().test(
        "percent",
        "Enter a percentage from 0 to 100.",
        (value) => {
          if (value == null || value.trim() === "") return false
          const discount = Number(value)
          return Number.isFinite(discount) && discount >= 0 && discount <= 100
        },
      ),
      reconciliationVarianceGhs: Yup.string().test(
        "amount",
        "Enter zero or a positive amount.",
        (value) => {
          if (value == null || value.trim() === "") return false
          const variance = Number(value)
          return Number.isFinite(variance) && variance >= 0
        },
      ),
    }
    if (options?.setupSecretRequired !== false) {
      shape.setupSecret = Yup.string()
        .trim()
        .required("Enter the setup access code.")
    }
    return Yup.object(shape)
  }

  return Yup.object({})
}

export function validateOnboardingStep(
  step: number,
  values: RestaurantOnboardingValues,
  options?: { setupSecretRequired?: boolean },
): OnboardingErrors {
  try {
    onboardingStepSchema(step, options).validateSync(values, {
      abortEarly: false,
    })
    return {}
  } catch (error) {
    if (!(error instanceof Yup.ValidationError)) return {}
    const errors: OnboardingErrors = {}
    const issues = error.inner.length > 0 ? error.inner : [error]
    for (const issue of issues) {
      const path = issue.path as OnboardingField | undefined
      if (!path || errors[path]) continue
      errors[path] = issue.message
    }
    return errors
  }
}
