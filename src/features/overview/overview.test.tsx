// @vitest-environment jsdom
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { Overview } from "./overview"

const runtime = vi.hoisted(() => ({
  compact: true,
  role: "OWNER",
  queries: vi.fn(),
  subscribeToMore: vi.fn(() => vi.fn()),
  refetch: vi.fn(async () => {}),
  mutate: vi.fn(),
}))
vi.mock("@/lib/use-media-query", () => ({
  useMediaQuery: () => runtime.compact,
}))
vi.mock("@/lib/auth-token", () => ({
  getAccessTokenProfile: () => ({
    sub: "staff",
    restaurantId: "restaurant",
    name: "Ama Mensah",
    role: runtime.role,
  }),
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/orders">{children}</a>
  ),
}))
vi.mock("@apollo/client/react", () => ({
  useQuery: (
    document: { definitions: Array<{ name?: { value: string } }> },
    options: { skip?: boolean }
  ) => {
    const name = document.definitions[0].name?.value
    runtime.queries(name, options)
    return {
      loading: false,
      refetch: runtime.refetch,
      subscribeToMore: runtime.subscribeToMore,
      data: options.skip
        ? undefined
        : name === "OverviewSales"
          ? {
              salesToday: {
                totalSales: 12550,
                orderCount: 4,
                paymentBreakdown: [{ method: "CASH", amount: 12550 }],
              },
            }
          : {
              currentShift: null,
              activeOrders: [
                {
                  id: "order",
                  ticketNumber: "B0001",
                  status: "NEW",
                  diningType: "TAKEAWAY",
                  notes: null,
                  tip: 0,
                  total: 12550,
                  createdAt: new Date().toISOString(),
                  payment: null,
                  items: [
                    {
                      id: "item",
                      name: "Jollof rice",
                      quantity: 1,
                      notes: null,
                      modifiers: [],
                    },
                  ],
                },
              ],
            },
    }
  },
  useMutation: () => [runtime.mutate, { loading: false }],
  useSubscription: vi.fn(),
}))
vi.mock("@/features/insights/sales-digest", () => ({
  SalesDigestCard: () => <p>Digest</p>,
}))
vi.mock("@/components/payment-donut", () => ({
  PaymentDonut: () => <p>Payment breakdown</p>,
  PaymentDonutSkeleton: () => <p>Loading payments</p>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  runtime.compact = true
  runtime.role = "OWNER"
  window.history.replaceState(null, "", "/overview")
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("overview responsive presentation", () => {
  it("uses the same data and URL search when resizing from mobile records to desktop table", () => {
    const view = render(<Overview />)
    expect(
      screen.getByRole("button", { name: "View order #B0001" })
    ).toBeTruthy()
    expect(screen.queryByRole("table")).toBeNull()
    expect(
      within(screen.getByRole("list", { name: "Today at a glance" })).getByText(
        /GHS\s*125\.50/
      )
    ).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Search orders" }), {
      target: { value: "jollof" },
    })
    expect(window.location.search).toContain("overviewSearch=jollof")
    runtime.compact = false
    view.rerender(<Overview />)
    expect(screen.getByRole("table")).toBeTruthy()
    expect(screen.getByText("#B0001")).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "View order #B0001" })
    ).toBeNull()
    expect(runtime.mutate).not.toHaveBeenCalled()
  })

  it("keeps sales queries and revenue metrics away from staff without reporting access", () => {
    runtime.role = "KITCHEN"
    render(<Overview />)
    expect(runtime.queries).toHaveBeenCalledWith(
      "OverviewSales",
      expect.objectContaining({ skip: true })
    )
    expect(screen.queryByText("Today's net revenue")).toBeNull()
    expect(screen.getByText("In preparation")).toBeTruthy()
    expect(screen.getByText("Ready to serve")).toBeTruthy()
    expect(runtime.mutate).not.toHaveBeenCalled()
  })
})
