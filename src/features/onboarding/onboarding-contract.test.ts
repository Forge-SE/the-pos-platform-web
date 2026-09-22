import { describe, expect, it } from "vitest"

import {
  initialOnboardingValues,
  restaurantSlug,
  toSetupRestaurantInput,
  validateOnboardingStep,
} from "./onboarding-contract"

describe("restaurant onboarding contract", () => {
  it("creates a contract-safe restaurant slug", () => {
    expect(restaurantSlug("  Ama's Kitchen & Grill  ")).toBe(
      "ama-s-kitchen-grill"
    )
  })

  it("converts percentages and cedis to backend integer units", () => {
    expect(
      toSetupRestaurantInput({
        ...initialOnboardingValues,
        name: "Ama's Kitchen",
        slug: "amas-kitchen",
        ownerName: "Ama Mensah",
        ownerPin: "2480",
        setupSecret: "pilot-secret",
        managerDiscountThresholdPercent: "7.5",
        reconciliationVarianceGhs: "12.40",
      })
    ).toMatchObject({
      managerDiscountThresholdBps: 750,
      reconciliationVarianceThreshold: 1240,
    })
  })

  it("enforces the backend PIN and slug constraints", () => {
    expect(
      validateOnboardingStep(0, {
        ...initialOnboardingValues,
        name: "A",
        slug: "Not Valid",
      })
    ).toEqual({
      name: "Enter the restaurant name.",
      slug: "Use lowercase letters, numbers, and single hyphens.",
    })

    expect(
      validateOnboardingStep(1, {
        ...initialOnboardingValues,
        ownerName: "Ama Mensah",
        ownerPin: "123",
        confirmOwnerPin: "124",
      })
    ).toMatchObject({
      ownerPin: "Enter a four-digit PIN.",
      confirmOwnerPin: "The PINs do not match.",
    })
  })
})
