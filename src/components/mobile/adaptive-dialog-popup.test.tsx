// @vitest-environment jsdom
import { useState } from "react"
import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { PricingDialog } from "@/features/pricing/modals/pricing-dialog"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("keeps a mobile form draft across desktop resizing and submits only through the form action", () => {
  const listeners = new Set<() => void>()
  const viewportListeners = new Set<() => void>()
  const viewport = {
    height: 640,
    addEventListener: (_: string, listener: () => void) =>
      viewportListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      viewportListeners.delete(listener),
  }
  vi.stubGlobal("visualViewport", viewport)
  const media = {
    matches: true,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  }
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) =>
      query.includes("max-width")
        ? media
        : {
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }
    )
  )
  const save = vi.fn()
  function Form() {
    const [name, setName] = useState("")
    return (
      <PricingDialog
        open
        title="New tax profile"
        description="Configure the profile."
        onOpenChange={vi.fn()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            save(name)
          }}
        >
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button type="submit">Save profile</button>
        </form>
      </PricingDialog>
    )
  }
  render(<Form />)
  expect(screen.getByRole("dialog").className).toContain("mobile-dialog-page")
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: "Standard VAT" },
  })
  expect(save).not.toHaveBeenCalled()
  expect(screen.getByRole("dialog").style.height).toBe("640px")
  act(() => {
    viewport.height = 360
    viewportListeners.forEach((listener) => listener())
  })
  expect(screen.getByRole("dialog").style.height).toBe("360px")
  act(() => {
    media.matches = false
    listeners.forEach((listener) => listener())
  })
  expect(screen.getByRole("dialog").className).not.toContain(
    "mobile-dialog-page"
  )
  expect(
    screen.getByRole<HTMLInputElement>("textbox", { name: "Name" }).value
  ).toBe("Standard VAT")
  fireEvent.submit(
    screen.getByRole("button", { name: "Save profile" }).closest("form")!
  )
  expect(save).toHaveBeenCalledExactlyOnceWith("Standard VAT")
})
