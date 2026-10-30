// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { MobileOverview } from "./mobile-overview"
import type { ActiveOrder } from "../overview-model"
import { LanguageProvider } from "@/components/language-provider"

const order: ActiveOrder = {
  id: "order-1",
  ticketNumber: "B0001",
  status: "PREPARING",
  diningType: "TAKEAWAY",
  notes: "Call at the gate",
  total: 12550,
  tip: 500,
  createdAt: new Date().toISOString(),
  payment: { method: "MOMO" },
  items: [
    {
      id: "item",
      name: "Jollof rice",
      quantity: 2,
      notes: "No pepper",
      modifiers: [{ id: "extra", name: "Extra chicken" }],
    },
  ],
}
const base = {
  name: "Ama",
  metrics: [
    { id: "sales", label: "Today's net revenue", value: "GHS 125.50" },
    { id: "orders", label: "Today's orders", value: "1" },
    { id: "active", label: "Active orders", value: "1" },
  ],
  orders: [order],
  loading: false,
  error: false,
  onRetry: vi.fn(async () => {}),
  search: "",
  onSearchChange: vi.fn(),
  action: <button>View orders</button>,
  shiftActionError: null,
}

beforeEach(() => {
  window.history.replaceState(null, "", "/overview")
  window.localStorage.clear()
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  vi.clearAllMocks()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("mobile overview", () => {
  it("keeps the summary visible and exposes every order detail without a wide table", async () => {
    const view = render(<MobileOverview {...base} />)
    const summary = screen.getByRole("list", { name: "Today at a glance" })
    expect(within(summary).getAllByRole("listitem")).toHaveLength(3)
    expect(screen.queryByRole("table")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "View order #B0001" }))
    const sheet = screen.getByRole("dialog", { name: "#B0001" })
    expect(within(sheet).getByText("No pepper")).toBeTruthy()
    expect(within(sheet).getByText("Extra chicken")).toBeTruthy()
    expect(within(sheet).getByText("Call at the gate")).toBeTruthy()
    expect(within(sheet).getByText(/GHS\s*5\.00/)).toBeTruthy()
    // Subscription updates must update the open details, without holding a stale object.
    view.rerender(
      <MobileOverview {...base} orders={[{ ...order, status: "READY" }]} />
    )
    expect(within(sheet).getByText("Ready")).toBeTruthy()
    window.history.back()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(window.location.pathname).toBe("/overview")
  })

  it("hides cached rows on failure and provides local retry", async () => {
    render(<MobileOverview {...base} error />)
    expect(
      screen.queryByRole("button", { name: "View order #B0001" })
    ).toBeNull()
    expect(screen.getByRole("alert").textContent).toContain("couldn’t load")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(base.onRetry).toHaveBeenCalledOnce())
  })

  it("supports search recovery and handles a removed order while its sheet is open", async () => {
    const view = render(<MobileOverview {...base} />)
    fireEvent.change(screen.getByRole("searchbox", { name: "Search orders" }), {
      target: { value: "jollof" },
    })
    expect(base.onSearchChange).toHaveBeenCalledWith("jollof")
    fireEvent.click(screen.getByRole("button", { name: "View order #B0001" }))
    view.rerender(<MobileOverview {...base} orders={[]} search="missing" />)
    expect(screen.getByText("This order is no longer active")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }))
    expect(base.onSearchChange).toHaveBeenCalledWith("")
  })

  it("translates the mobile record actions and notes into French", () => {
    window.localStorage.setItem("pos.language", "fr")
    render(
      <LanguageProvider>
        <MobileOverview {...base} />
      </LanguageProvider>
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Voir la commande #B0001" })
    )
    expect(
      within(screen.getByRole("dialog")).getByText("Notes de commande")
    ).toBeTruthy()
  })
})
