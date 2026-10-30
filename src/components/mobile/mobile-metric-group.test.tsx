// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MobileMetricGroup } from "./mobile-metric-group"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("offers explicit paging for the optional swipe rail and respects reduced motion", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true }))
  )
  render(
    <MobileMetricGroup
      layout="swipe"
      label="Service metrics"
      items={[
        { id: "ready", label: "Ready", value: "3" },
        { id: "preparing", label: "Preparing", value: "5" },
      ]}
    />
  )
  const rail = screen.getByRole("list", { name: "Service metrics" })
  const scrollBy = vi.fn()
  rail.scrollBy = scrollBy
  Object.defineProperty(rail, "clientWidth", { value: 300 })
  fireEvent.click(screen.getByRole("button", { name: "Next cards" }))
  expect(scrollBy).toHaveBeenLastCalledWith({ left: 258, behavior: "instant" })
  fireEvent.click(screen.getByRole("button", { name: "Previous cards" }))
  expect(scrollBy).toHaveBeenLastCalledWith({ left: -258, behavior: "instant" })
  expect(rail.tabIndex).toBe(0)
})
