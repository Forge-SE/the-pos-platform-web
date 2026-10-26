// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { ThemeProvider, useTheme } from "./theme-provider"

function ThemeControl() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme}
    </button>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal("matchMedia", () => ({ matches: false }))
  document.documentElement.classList.remove("dark")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("ThemeProvider", () => {
  it("persists the chosen theme and restores it on remount", () => {
    const view = render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByRole("button", { name: "light" }))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("pos.theme")).toBe("dark")
    view.unmount()
    render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>
    )
    expect(screen.getByRole("button", { name: "dark" })).toBeTruthy()
  })
})
