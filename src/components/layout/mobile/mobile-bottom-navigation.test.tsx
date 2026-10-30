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
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { MobileBottomNavigation } from "./mobile-bottom-navigation"
import { useRouterUrlState } from "@/lib/use-router-url-state"
import { useUrlState } from "@/lib/url-state"

const histories: ReturnType<typeof createBrowserHistory>[] = []
afterEach(() => {
  cleanup()
  for (const history of histories.splice(0)) history.destroy()
})
beforeEach(() => {
  window.scrollTo = vi.fn()
})

function Shell() {
  useRouterUrlState()
  const [desk] = useUrlState("desk")
  return (
    <>
      <p data-testid="view">{desk ?? "sell"}</p>
      <MobileBottomNavigation
        profile={{
          sub: "cashier",
          restaurantId: "restaurant",
          name: "Ama",
          role: "CASHIER",
        }}
        onOpenPreferences={vi.fn()}
      />
    </>
  )
}

async function mount() {
  window.history.replaceState(null, "", "/orders?orderSearch=kept")
  const root = createRootRoute({ component: Shell })
  const orders = createRoute({
    getParentRoute: () => root,
    path: "/orders",
    validateSearch: (search: Record<string, unknown>) => search,
  })
  const shift = createRoute({ getParentRoute: () => root, path: "/shift" })
  const overview = createRoute({
    getParentRoute: () => root,
    path: "/overview",
  })
  const history = createBrowserHistory()
  histories.push(history)
  const router = createRouter({
    routeTree: root.addChildren([orders, shift, overview]),
    history,
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole("navigation", { name: "Main navigation" })
  return history
}

describe("floating mobile navigation", () => {
  it("switches cashier views through URL state and restores them with Back", async () => {
    const history = await mount()
    const nav = screen.getByRole("navigation", { name: "Main navigation" })
    fireEvent.click(within(nav).getByRole("link", { name: "Orders" }))
    await waitFor(() =>
      expect(screen.getByTestId("view").textContent).toBe("status")
    )
    expect(
      within(nav)
        .getByRole("link", { name: "Orders" })
        .getAttribute("aria-current")
    ).toBe("page")
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    history.back()
    await waitFor(() =>
      expect(screen.getByTestId("view").textContent).toBe("sell")
    )
    expect(window.location.search).toContain("orderSearch=kept")
  })

  it("opens role-specific tools and replaces the sheet history entry when navigating", async () => {
    const history = await mount()
    fireEvent.click(screen.getByRole("button", { name: "More" }))
    const sheet = screen.getByRole("dialog", { name: "Your workspace" })
    expect(within(sheet).queryByRole("link", { name: "Team" })).toBeNull()
    fireEvent.click(within(sheet).getByRole("link", { name: "Shift & cash" }))
    await waitFor(() => expect(window.location.pathname).toBe("/shift"))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    history.back()
    await waitFor(() => expect(window.location.pathname).toBe("/orders"))
    expect(window.location.search).not.toContain("mobilePanel")
  })
})
