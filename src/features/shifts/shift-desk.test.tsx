// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { ShiftDesk } from "./shift-desk"

const state = vi.hoisted(() => ({
  check: {
    shiftId: "shift-1",
    activeOrderCount: 0,
    unpaidOrders: [] as Array<{ id: string }>,
  },
  error: undefined as Error | undefined,
  loading: false,
}))
vi.mock("@apollo/client/react", () => ({
  useQuery: (document: { definitions: Array<{ name?: { value: string } }> }) =>
    document.definitions[0].name?.value === "CurrentShift"
      ? {
          data: {
            currentShift: {
              id: "shift-1",
              status: "OPEN",
              openingFloat: 1000,
              openedAt: "2026-10-07T12:00:00Z",
            },
          },
          loading: false,
          refetch: vi.fn(),
        }
      : {
          data: { shiftClosureCheck: state.check },
          loading: state.loading,
          error: state.error,
          refetch: vi.fn(),
        },
  useMutation: () => [vi.fn(), { loading: false }],
}))
vi.mock("@/lib/auth-token", () => ({
  getAccessTokenProfile: () => ({ role: "CASHIER" }),
}))
vi.mock("./shift-payments", () => ({
  SHIFT_CLOSURE_CHECK: {
    definitions: [{ name: { value: "ShiftClosureCheck" } }],
  },
  ShiftPayments: () => <div>Recovery panel</div>,
}))
beforeEach(() => {
  state.check = { shiftId: "shift-1", activeOrderCount: 0, unpaidOrders: [] }
  state.error = undefined
  state.loading = false
})
afterEach(cleanup)
describe("shift close readiness", () => {
  it("blocks closing until all completed orders are paid", () => {
    state.check.unpaidOrders = [{ id: "order-1" }]
    render(<ShiftDesk />)
    expect(
      screen
        .getByRole("button", { name: "Close shift" })
        .hasAttribute("disabled")
    ).toBe(true)
    expect(screen.getByText("Recovery panel")).toBeDefined()
  })
  it("blocks closing on active orders and query failures", () => {
    state.check.activeOrderCount = 1
    const view = render(<ShiftDesk />)
    expect(
      screen
        .getByRole("button", { name: "Close shift" })
        .hasAttribute("disabled")
    ).toBe(true)
    state.check.activeOrderCount = 0
    state.error = new Error("Network failure")
    view.rerender(<ShiftDesk />)
    expect(
      screen
        .getByRole("button", { name: "Close shift" })
        .hasAttribute("disabled")
    ).toBe(true)
  })
  it("enables closing only after the readiness check succeeds", () => {
    state.loading = true
    const view = render(<ShiftDesk />)
    expect(
      screen
        .getByRole("button", { name: "Close shift" })
        .hasAttribute("disabled")
    ).toBe(true)
    state.loading = false
    view.rerender(<ShiftDesk />)
    expect(
      screen
        .getByRole("button", { name: "Close shift" })
        .hasAttribute("disabled")
    ).toBe(false)
  })
})
