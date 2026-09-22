import type {
  OnboardingErrors,
  OnboardingField,
  RestaurantOnboardingValues,
} from "../onboarding-contract"

export interface OnboardingStepProps {
  values: RestaurantOnboardingValues
  errors: OnboardingErrors
  updateField: <TField extends OnboardingField>(
    field: TField,
    value: RestaurantOnboardingValues[TField]
  ) => void
}
