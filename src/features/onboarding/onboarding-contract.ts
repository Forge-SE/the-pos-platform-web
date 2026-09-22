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

export function validateOnboardingStep(
  step: number,
  values: RestaurantOnboardingValues,
  options?: { setupSecretRequired?: boolean }
): OnboardingErrors {
  const errors: OnboardingErrors = {}

  if (step === 0) {
    if (values.name.trim().length < 2) {
      errors.name = "Enter the restaurant name."
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
      errors.slug = "Use lowercase letters, numbers, and single hyphens."
    }
  }

  if (step === 1) {
    if (values.ownerName.trim().length < 2) {
      errors.ownerName = "Enter the owner’s name."
    }
    if (!/^\d{4}$/.test(values.ownerPin)) {
      errors.ownerPin = "Enter a four-digit PIN."
    }
    if (values.confirmOwnerPin !== values.ownerPin) {
      errors.confirmOwnerPin = "The PINs do not match."
    }
  }

  if (step === 2) {
    const discount = Number(values.managerDiscountThresholdPercent)
    const variance = Number(values.reconciliationVarianceGhs)

    if (
      values.managerDiscountThresholdPercent.trim() === "" ||
      !Number.isFinite(discount) ||
      discount < 0 ||
      discount > 100
    ) {
      errors.managerDiscountThresholdPercent =
        "Enter a percentage from 0 to 100."
    }
    if (
      values.reconciliationVarianceGhs.trim() === "" ||
      !Number.isFinite(variance) ||
      variance < 0
    ) {
      errors.reconciliationVarianceGhs = "Enter zero or a positive amount."
    }
    if (options?.setupSecretRequired !== false && !values.setupSecret.trim()) {
      errors.setupSecret = "Enter the setup access code."
    }
  }

  return errors
}
