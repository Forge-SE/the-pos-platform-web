// @vitest-environment jsdom
import { useState } from "react"
import type { ReactNode } from "react"
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Orders } from "./Orders"

vi.mock("@/lib/auth-token", () => ({
  getAccessTokenProfile: () => ({ role: "CASHIER" }),
}))
vi.mock("@/features/orders/cashier-desk", () => ({
  CashierDesk: ({
    active,
    switcher,
  }: {
    active: boolean
    switcher: ReactNode
  }) => {
    const [draft, setDraft] = useState("")
    return (
      <>
        <input
          aria-label="Bag draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <span data-testid="selling">{String(active)}</span>
        {switcher}
      </>
    )
  },
}))
vi.mock("@/features/orders/kitchen-display", () => ({
  KitchenDisplay: () => <p>Live order status</p>,
}))
vi.mock("@/features/orders/owner-orders", () => ({
  OwnerOrders: () => <p>Order history</p>,
}))
afterEach(cleanup)

it("retains a cashier draft when visiting status and history then returning to Sell", () => {
  window.history.replaceState(null, "", "/orders")
  render(<Orders />)
  fireEvent.change(screen.getByRole("textbox", { name: "Bag draft" }), {
    target: { value: "2 jollof, no pepper" },
  })
  const visit = (search: string) => {
    window.history.replaceState(null, "", `/orders${search}`)
    fireEvent.popState(window)
  }
  visit("?desk=status")
  expect(screen.getByText("Live order status")).toBeTruthy()
  expect(screen.getByTestId("selling").textContent).toBe("false")
  visit("?desk=history")
  expect(screen.getByText("Order history")).toBeTruthy()
  visit("")
  expect(
    screen.getByRole<HTMLInputElement>("textbox", { name: "Bag draft" }).value
  ).toBe("2 jollof, no pepper")
  expect(screen.getByTestId("selling").textContent).toBe("true")
})
