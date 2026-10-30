import { describe, expect, it } from "vitest"
import {
  isMobileDestinationActive,
  mobileMoreNavigationFor,
  mobileNavigationFor,
  mobileScreenTitle,
} from "./mobile-navigation-model"
import type { AccessTokenProfile } from "@/lib/auth-token"

const profile = (role: AccessTokenProfile["role"]): AccessTokenProfile => ({
  sub: "staff",
  restaurantId: "restaurant",
  name: "Ama",
  role,
})

describe("mobile role navigation", () => {
  it("names the current role-specific screen in the compact header", () => {
    expect(mobileScreenTitle("/overview", null, "OWNER")).toBe("Overview")
    expect(mobileScreenTitle("/orders", null, "CASHIER")).toBe("Counter")
    expect(mobileScreenTitle("/orders", "status", "CASHIER")).toBe(
      "Order status"
    )
    expect(mobileScreenTitle("/orders", "history", "MANAGER")).toBe("Orders")
    expect(mobileScreenTitle("/orders", null, "MANAGER")).toBe("Kitchen")
  })
  it("distinguishes cashier views on the same route", () => {
    const items = mobileNavigationFor(profile("CASHIER"))
    expect(items.map((item) => item.label)).toEqual([
      "Sell",
      "Orders",
      "History",
    ])
    for (const [desk, id] of [
      [null, "sell"],
      ["status", "orders"],
      ["history", "history"],
    ] as const) {
      expect(
        items
          .filter((item) => isMobileDestinationActive(item, "/orders", desk))
          .map((item) => item.id)
      ).toEqual([id])
    }
  })

  it("opens manager history from Orders and keeps kitchen access in More", () => {
    const manager = profile("MANAGER")
    const orders = mobileNavigationFor(manager).find(
      (item) => item.id === "orders"
    )!
    expect(orders.desk).toBe("history")
    expect(isMobileDestinationActive(orders, "/orders", null)).toBe(false)
    const kitchen = mobileMoreNavigationFor(manager).find(
      (item) => item.id === "kitchen"
    )!
    expect(isMobileDestinationActive(kitchen, "/orders", null)).toBe(true)
  })

  it("keeps management pages away from cashier and kitchen navigation", () => {
    for (const role of ["CASHIER", "KITCHEN"] as const) {
      const destinations = [
        ...mobileNavigationFor(profile(role)),
        ...mobileMoreNavigationFor(profile(role)),
      ]
      expect(destinations.map((item) => item.to)).not.toContain("/performance")
      expect(destinations.map((item) => item.to)).not.toContain("/team")
      expect(destinations.map((item) => item.to)).not.toContain("/settings")
      expect(destinations.filter((item) => item.to === "/shift")).toHaveLength(
        1
      )
    }
    expect(
      mobileMoreNavigationFor({
        ...profile("KITCHEN"),
        permissions: ["INVENTORY_VIEW"],
      }).some((item) => item.to === "/inventory")
    ).toBe(true)
  })
})
