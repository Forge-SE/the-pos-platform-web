// @vitest-environment jsdom
import type { ComponentProps, ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { OpsRestaurants, RestaurantDetail } from "./ops-restaurants"
import type * as ActualAudit from "./ops-audit"

const state = vi.hoisted(() => ({
  query: vi.fn(),
  navigate: vi.fn(),
  mutate: vi.fn(),
  refetch: vi.fn(),
}))
vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => state.query(...args),
  useMutation: () => [state.mutate, { loading: false }],
}))
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => state.navigate,
  Link: ({
    to,
    params,
    search,
    ...props
  }: ComponentProps<"a"> & {
    to: string
    params?: { restaurantId: string }
    search?: { tab: string }
  }) => (
    <a
      {...props}
      href={
        to.replace("$restaurantId", params?.restaurantId ?? "") +
        (search ? "?tab=" + search.tab : "")
      }
    />
  ),
}))
vi.mock("./use-ops-auth-error", () => ({ useOpsAuthError: vi.fn() }))
vi.mock("./ops-restaurant-edit", () => ({
  RestaurantEditModal: () => <div>Edit restaurant form</div>,
}))
vi.mock("./ops-overlays", () => ({
  OpsModal: ({ open, children }: { open: boolean; children?: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}))
vi.mock("./ops-audit", () => ({
  OpsAudit: ({ restaurantId }: { restaurantId: string }) => (
    <div>Audit for {restaurantId}</div>
  ),
}))
vi.mock("../payouts/paystack-settings", () => ({
  PaystackSettings: ({ restaurantId }: { restaurantId: string }) => (
    <div>Settlement for {restaurantId}</div>
  ),
}))

const restaurant = {
  id: "restaurant-1",
  name: "Test Kitchen",
  slug: "test-kitchen",
  code: "KITCHEN",
  currency: "GHS",
  timezone: "Africa/Accra",
  suspended: false,
  createdAt: "2026-10-10T12:00:00Z",
  address: "Market Road",
  city: "Accra",
  region: "Greater Accra",
  description: "Restaurant description",
  openingHours: [
    { day: "monday", closed: false, opens: "09:00", closes: "21:00" },
  ],
  compliance: {
    businessRegistrationNumber: "REG-123",
    tin: "TIN-123",
    foodHygienePermit: null,
    districtAssemblyPermit: null,
    notes: null,
  },
}
beforeEach(() => {
  vi.clearAllMocks()
  state.query.mockReturnValue({
    data: {
      platformRestaurant: {
        restaurant,
        staff: [{ id: "staff-1", name: "Ama", role: "CASHIER", active: true }],
        staffCount: 1,
        activeStaffCount: 1,
      },
      platformRestaurants: { items: [restaurant], total: 1 },
      platformAuditLogs: { items: [], total: 0 },
    },
    loading: false,
    error: undefined,
    refetch: state.refetch,
  })
})
afterEach(cleanup)

describe("restaurant detail page", () => {
  it("locks embedded audit queries to this restaurant while retaining action filtering and pagination", async () => {
    const { OpsAudit } =
      await vi.importActual<typeof ActualAudit>("./ops-audit")
    render(<OpsAudit restaurantId="restaurant-1" embedded />)
    expect(state.query).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          restaurantId: "restaurant-1",
          action: null,
          limit: 25,
          offset: 0,
        },
      })
    )
    expect(
      screen.queryByRole("textbox", { name: "Filter by restaurant ID" })
    ).toBeNull()
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search audit actions" }),
      { target: { value: "staff.updated" } }
    )
    expect(state.query).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          restaurantId: "restaurant-1",
          action: "staff.updated",
          limit: 25,
          offset: 0,
        },
      })
    )
  })
  it("opens restaurant rows as a page, with an accessible detail link", () => {
    render(<OpsRestaurants />)
    expect(
      screen.getByRole("link", { name: "Test Kitchen" }).getAttribute("href")
    ).toBe("/ops/restaurants/restaurant-1?tab=general")
    fireEvent.click(screen.getByText("test-kitchen"))
    expect(state.navigate).toHaveBeenCalledWith({
      to: "/ops/restaurants/$restaurantId",
      params: { restaurantId: "restaurant-1" },
      search: { tab: "general" },
    })
    expect(screen.queryByRole("dialog")).toBeNull()
  })
  it("keeps all four URL-backed horizontal sections and existing general details", () => {
    render(<RestaurantDetail restaurantId="restaurant-1" tab="general" />)
    expect(
      screen.getByRole("navigation", { name: "Restaurant sections" })
    ).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "General" }).getAttribute("aria-current")
    ).toBe("page")
    expect(
      screen.getByRole("link", { name: "Payments" }).getAttribute("href")
    ).toBe("/ops/restaurants/restaurant-1?tab=payments")
    expect(screen.getByRole("link", { name: "Compliance" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Audit logs" })).toBeTruthy()
    expect(screen.getByText("Ama")).toBeTruthy()
    expect(screen.getByText("KITCHEN")).toBeTruthy()
    expect(screen.queryByText("REG-123")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }))
    expect(screen.getByText("Edit restaurant form")).toBeTruthy()
  })
  it("separates settlement, compliance and restaurant-scoped audit content", () => {
    const { rerender } = render(
      <RestaurantDetail restaurantId="restaurant-1" tab="payments" />
    )
    expect(screen.getByText("Settlement for restaurant-1")).toBeTruthy()
    expect(screen.queryByText("Ama")).toBeNull()
    rerender(<RestaurantDetail restaurantId="restaurant-1" tab="compliance" />)
    expect(screen.getByText("REG-123")).toBeTruthy()
    expect(screen.queryByText("Settlement for restaurant-1")).toBeNull()
    rerender(<RestaurantDetail restaurantId="restaurant-1" tab="audit" />)
    expect(screen.getByText("Audit for restaurant-1")).toBeTruthy()
    expect(screen.queryByText("REG-123")).toBeNull()
  })
  it("handles unavailable restaurants and query failures without showing cached panels", () => {
    state.query.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: state.refetch,
    })
    const { rerender } = render(
      <RestaurantDetail restaurantId="missing" tab="general" />
    )
    expect(screen.getByText("Restaurant not found")).toBeTruthy()
    state.query.mockReturnValue({
      data: { platformRestaurant: { restaurant } },
      loading: false,
      error: new Error("offline"),
      refetch: state.refetch,
    })
    rerender(<RestaurantDetail restaurantId="missing" tab="payments" />)
    expect(screen.getByText("Couldn’t load this restaurant.")).toBeTruthy()
    expect(screen.queryByText("Settlement for restaurant-1")).toBeNull()
  })
})
