// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { EmptyState, ErrorState } from "./content-state"
import { Button } from "./ui/button"

afterEach(cleanup)

describe("shared content states", () => {
  it("centers an empty state with a decorative icon and a recovery action", () => {
    const { container } = render(
      <EmptyState title="No entries found." description="Clear your filters." />
    )
    const state = screen.getByRole("status")
    expect(state.className).toContain("flex-1")
    expect(state.className).toContain("items-center")
    expect(state.className).toContain("justify-center")
    expect(state.className).toContain("flex-col")
    expect(
      container.querySelector('span[aria-hidden="true"] svg')
    ).not.toBeNull()
    expect(screen.getByRole("button", { name: "Check again" })).toBeDefined()
  })

  it("uses the supplied action instead of adding a duplicate fallback", () => {
    const create = vi.fn()
    render(
      <EmptyState
        title="No staff yet."
        action={<Button onClick={create}>Add staff</Button>}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Add staff" }))
    expect(create).toHaveBeenCalledOnce()
    expect(screen.queryByRole("button", { name: "Check again" })).toBeNull()
  })

  it("disables retries while the request is pending and handles rejection", async () => {
    let reject: (reason: Error) => void = () => {}
    const request = new Promise((_, fail) => {
      reject = fail
    })
    const retry = vi.fn(() => request)
    render(<ErrorState title="Could not load entries." onRetry={retry} />)
    expect(screen.getByRole("alert")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    const button = screen.getByRole<HTMLButtonElement>("button", {
      name: "Trying again…",
    })
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(retry).toHaveBeenCalledOnce()
    reject(new Error("Still offline"))
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: "Try again" })
          .disabled
      ).toBe(false)
    )
    expect(screen.getByText("Could not load entries.")).toBeDefined()
  })

  it("works inside a spanning table cell without invalid table nesting", () => {
    const { container } = render(
      <section className="content-region">
        <table>
          <tbody>
            <tr>
              <td colSpan={4}>
                <EmptyState title="No matching rows." />
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    )
    expect(
      container.querySelector('td[colspan="4"] > [data-content-state="empty"]')
    ).not.toBeNull()
  })
})
