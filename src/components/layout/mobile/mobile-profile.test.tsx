// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { MobileProfile } from "./mobile-profile"
import { ThemeProvider } from "@/components/theme-provider"

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
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function mount(role: "CASHIER" | "MANAGER" = "MANAGER") {
  const preferences = vi.fn(),
    signOut = vi.fn(),
    settings = vi.fn()
  render(
    <ThemeProvider>
      <MobileProfile
        profile={{
          sub: "staff",
          restaurantId: "restaurant",
          name: "Ama Mensah",
          role,
        }}
        restaurantName="Birthday Restaurant"
        restaurantCode="R0001"
        onOpenPreferences={preferences}
        onSignOut={signOut}
        onOpenSettings={role === "MANAGER" ? settings : undefined}
      />
    </ThemeProvider>
  )
  return { preferences, signOut, settings }
}

describe("mobile account sheet", () => {
  it("shows identity, changes appearance, and hands off to preferences", async () => {
    const actions = mount()
    fireEvent.click(screen.getByRole("button", { name: "Open your profile" }))
    expect(screen.getByRole("dialog", { name: "Your account" })).toBeTruthy()
    expect(screen.getByText("Ama Mensah")).toBeTruthy()
    expect(screen.getByText("Birthday Restaurant · R0001")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Dark" }))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    fireEvent.click(
      screen.getByRole("button", { name: "Language & preferences" })
    )
    expect(actions.preferences).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(window.location.search).not.toContain("mobilePanel")
  })

  it("dismisses the sheet with device Back before leaving the page", async () => {
    mount()
    fireEvent.click(screen.getByRole("button", { name: "Open your profile" }))
    expect(window.location.search).toContain("mobilePanel=account")
    window.history.back()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(window.location.pathname).toBe("/overview")
  })

  it("keeps restaurant administration away from staff while allowing sign out", () => {
    const actions = mount("CASHIER")
    fireEvent.click(screen.getByRole("button", { name: "Open your profile" }))
    expect(
      screen.queryByRole("button", { name: "Restaurant settings" })
    ).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Log out" }))
    expect(actions.signOut).toHaveBeenCalledOnce()
  })
})
