import { describe, expect, it } from "vitest"
import {
  managementNavigation,
  primaryNavigationFor,
  seesManagementItem,
} from "@/components/layout/sidebar"
import type { AccessTokenProfile } from "@/lib/auth-token"

function profile(role: AccessTokenProfile["role"]): AccessTokenProfile {
  return { sub: "user", restaurantId: "restaurant", name: "Test", role }
}

describe("role navigation", () => {
  it("keeps performance and settings away from cashiers", () => {
    expect(
      primaryNavigationFor("CASHIER").map((item) => item.to)
    ).not.toContain("/performance")
    const settings = managementNavigation.find(
      (item) => item.to === "/settings"
    )!
    expect(seesManagementItem(profile("CASHIER"), settings)).toBe(false)
  })

  it("shows performance and settings to managers and owners", () => {
    const settings = managementNavigation.find(
      (item) => item.to === "/settings"
    )!
    for (const role of ["MANAGER", "OWNER"] as const) {
      expect(primaryNavigationFor(role).map((item) => item.to)).toContain(
        "/performance"
      )
      expect(seesManagementItem(profile(role), settings)).toBe(true)
    }
  })
})
