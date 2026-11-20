// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { CloneVoiceDialog } from "./clone-voice-dialog"

beforeEach(() => {
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

function view() {
  return render(
    <CloneVoiceDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />
  )
}

describe("record & clone wizard", () => {
  it("starts with consent unchecked and blocks continuing without it", () => {
    view()
    const checkbox = screen.getByRole("checkbox")
    expect(checkbox.getAttribute("aria-checked")).toBe("false")
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(
      screen.getByText("Confirm the speaker's consent to continue.")
    ).toBeTruthy()
    expect(screen.getByText(/Step 1 of 3/)).toBeTruthy()
  })

  it("requires a consent reference as well as the checkbox", () => {
    view()
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByText("Describe who consented and how.")).toBeTruthy()
    fireEvent.change(
      screen.getByRole("textbox", { name: "How was consent recorded?" }),
      { target: { value: "Ama Mensah, signed form 12 Nov" } }
    )
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByText(/Step 2 of 3/)).toBeTruthy()
    // No takes yet: continuing to naming stays blocked.
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByText("Record at least one take.")).toBeTruthy()
  })
})
