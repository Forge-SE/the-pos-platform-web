// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TaxProfileForm } from "./tax-profile-form"

const query = vi.hoisted(() => ({
  data: undefined as
    | {
        taxConfiguration: { profileCode: string; priceMode: string }
        taxProfiles: Array<{
          profileCode: string
          label: string
          effectiveFrom: string
          rules: Array<{ name: string; rateBps: number }>
        }>
      }
    | undefined,
  loading: false,
  error: undefined as Error | undefined,
  refetch: vi.fn().mockResolvedValue({}),
}))

vi.mock("@apollo/client/react", () => ({
  useQuery: () => query,
  useMutation: () => [vi.fn(), { loading: false }],
}))

afterEach(() => {
  cleanup()
  query.data = undefined
  query.error = undefined
  query.loading = false
  query.refetch.mockClear()
})

describe("tax profile content states", () => {
  it("shows an error icon, message, and retry action in a centered full-height state", () => {
    query.error = new Error("Network error")
    const { container } = render(<TaxProfileForm />)
    const state = screen.getByRole("alert")
    expect(state.className).toContain("flex-1")
    expect(state.className).toContain("items-center")
    expect(state.className).toContain("justify-center")
    expect(state.className).toContain("flex-col")
    expect(
      container.querySelector('span[aria-hidden="true"] svg')
    ).not.toBeNull()
    expect(screen.getByText("Tax profiles could not be loaded.")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(query.refetch).toHaveBeenCalledOnce()
  })

  it("explains missing tax rules without exposing raw server errors", () => {
    query.error = new Error(
      "No effective tax rules are available for this profile"
    )
    render(<TaxProfileForm />)
    expect(
      screen.getByText(
        /Contact your platform administrator to complete tax setup/
      )
    ).toBeDefined()
    expect(screen.queryByText(query.error.message)).toBeNull()
  })

  it("shows an actionable empty state instead of an empty form", () => {
    query.data = {
      taxConfiguration: {
        profileCode: "NOT_REGISTERED",
        priceMode: "INCLUSIVE",
      },
      taxProfiles: [],
    }
    render(<TaxProfileForm />)
    expect(screen.getByRole("status").getAttribute("data-content-state")).toBe(
      "empty"
    )
    expect(screen.getByText("No tax profiles available.")).toBeDefined()
    expect(screen.queryByText("Save tax profile")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(query.refetch).toHaveBeenCalledOnce()
  })

  it("keeps the error state centered while retry is in progress", () => {
    query.error = new Error("Network error")
    query.loading = true
    render(<TaxProfileForm />)
    expect(screen.getByRole("alert")).toBeDefined()
    const retry = screen.getByRole<HTMLButtonElement>("button", {
      name: "Trying again…",
    })
    expect(retry.disabled).toBe(true)
  })
})
