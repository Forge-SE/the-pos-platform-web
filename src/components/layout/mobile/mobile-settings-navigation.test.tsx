// @vitest-environment jsdom
import { useState } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router"
import { MainLayout } from "../main-layout"

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { ownerOnboardingRequired: false },
    loading: false,
  }),
}))
vi.mock("@/lib/auth-token", () => ({
  clearAuthSession: vi.fn(),
  getAccessTokenProfile: () => ({
    sub: "cashier",
    restaurantId: "restaurant",
    role: "CASHIER",
    name: "Ama",
  }),
}))
vi.mock("@/lib/apollo-error-link", () => ({
  APOLLO_RESTAURANT_SUSPENDED_EVENT: "suspended",
  APOLLO_UNAUTHENTICATED_EVENT: "unauthenticated",
}))
vi.mock("@/components/layout/mobile/mobile-header", () => ({
  MobileHeader: ({ onOpenPreferences }: { onOpenPreferences: () => void }) => (
    <button onClick={onOpenPreferences}>Open preferences</button>
  ),
}))
vi.mock("@/components/layout/sidebar", () => ({ Sidebar: () => null }))
vi.mock("@/components/layout/mobile/mobile-bottom-navigation", () => ({
  MobileBottomNavigation: () => null,
}))
vi.mock("@/components/layout/notification-button", () => ({
  NotificationButton: () => null,
}))
vi.mock("@/features/orders/station-alarm", () => ({ StationAlarm: () => null }))
vi.mock("@/components/layout/shift-banner", () => ({ ShiftBanner: () => null }))
vi.mock("@/features/offline/offline-sync", () => ({ OfflineSync: () => null }))
vi.mock("@/features/branding/restaurant-branding", () => ({
  RestaurantBranding: ({
    onOpenChange,
  }: {
    onOpenChange: (open: boolean) => void
  }) => (
    <section aria-label="Settings">
      <button onClick={() => onOpenChange(false)}>Back to counter</button>
    </section>
  ),
}))

const histories: ReturnType<typeof createBrowserHistory>[] = []
beforeEach(() => {
  window.history.replaceState(null, "", "/orders?orderSearch=kept")
  window.scrollTo = vi.fn()
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  for (const history of histories.splice(0)) history.destroy()
  vi.unstubAllGlobals()
})

function CounterDraft() {
  const [draft, setDraft] = useState("")
  return (
    <input
      aria-label="Current bag"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}

it("presents settings as a mobile page without unmounting the cashier draft, and supports Back", async () => {
  const root = createRootRoute({ component: Outlet })
  const layout = createRoute({
    getParentRoute: () => root,
    id: "_app",
    component: MainLayout,
  })
  const orders = createRoute({
    getParentRoute: () => layout,
    path: "/orders",
    component: CounterDraft,
  })
  const overview = createRoute({
    getParentRoute: () => layout,
    path: "/overview",
    component: () => null,
  })
  const history = createBrowserHistory()
  histories.push(history)
  const router = createRouter({
    routeTree: root.addChildren([layout.addChildren([orders, overview])]),
    history,
  })
  render(<RouterProvider router={router} />)
  const bag = await screen.findByRole("textbox", { name: "Current bag" })
  fireEvent.change(bag, { target: { value: "2 jollof, no pepper" } })
  fireEvent.click(screen.getByRole("button", { name: "Open preferences" }))
  expect(screen.getByRole("region", { name: "Settings" })).toBeTruthy()
  expect(screen.queryByRole("textbox", { name: "Current bag" })).toBeNull()
  expect(window.location.search).toContain("settings=preferences")
  fireEvent.click(screen.getByRole("button", { name: "Back to counter" }))
  await waitFor(() =>
    expect(screen.queryByRole("region", { name: "Settings" })).toBeNull()
  )
  expect(
    screen.getByRole<HTMLInputElement>("textbox", { name: "Current bag" }).value
  ).toBe("2 jollof, no pepper")
  expect(window.location.search).toContain("orderSearch=kept")
  fireEvent.click(screen.getByRole("button", { name: "Open preferences" }))
  window.history.back()
  await waitFor(() =>
    expect(screen.queryByRole("region", { name: "Settings" })).toBeNull()
  )
  expect(
    screen.getByRole<HTMLInputElement>("textbox", { name: "Current bag" }).value
  ).toBe("2 jollof, no pepper")
})
