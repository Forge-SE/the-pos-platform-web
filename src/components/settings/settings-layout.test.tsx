// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { GearSixIcon } from "@phosphor-icons/react"
import { SettingsBody, SettingsDialog, SettingsHeader } from "./settings-layout"

const change = vi.fn(),
  close = vi.fn()
function view() {
  return (
    <SettingsDialog
      open
      label="Settings"
      items={[
        { id: "restaurant", label: "Restaurant", icon: GearSixIcon },
        { id: "preferences", label: "Preferences", icon: GearSixIcon },
      ]}
      section="restaurant"
      onSectionChange={change}
      onOpenChange={close}
    >
      <SettingsHeader
        title="Restaurant"
        description="Your restaurant identity."
      />
      <SettingsBody>
        <input aria-label="Restaurant name" defaultValue="Birthday" />
      </SettingsBody>
    </SettingsDialog>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("uses a real content page on mobile with a Back action and section controls", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  render(view())
  expect(screen.queryByRole("dialog")).toBeNull()
  expect(screen.getByRole("region", { name: "Settings" })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Preferences" }))
  expect(change).toHaveBeenCalledWith("preferences")
  fireEvent.change(screen.getByRole("textbox", { name: "Restaurant name" }), {
    target: { value: "Updated" },
  })
  expect(
    screen.getByRole<HTMLInputElement>("textbox", { name: "Restaurant name" })
      .value
  ).toBe("Updated")
  fireEvent.click(screen.getByRole("button", { name: "Back" }))
  expect(close).toHaveBeenCalledWith(false)
})

it("keeps the desktop settings dialog and its close control", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  render(view())
  expect(screen.getByRole("dialog", { name: "Restaurant" })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Close settings" }))
  expect(close).toHaveBeenCalledWith(false, expect.anything())
})
