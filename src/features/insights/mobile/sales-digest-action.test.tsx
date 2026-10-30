// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { SalesDigestAction } from "./sales-digest-action"

const runtime = vi.hoisted(() => ({
  query: vi.fn(),
  send: vi.fn(async () => ({})),
  refetch: vi.fn(async () => ({})),
}))
vi.mock("@/lib/auth-token", () => ({
  getAccessTokenProfile: () => ({ role: "OWNER" }),
}))
vi.mock("@apollo/client/react", () => ({
  useQuery: () => {
    runtime.query()
    return {
      loading: false,
      refetch: runtime.refetch,
      data: { salesDigest: { netSales: 12550, orders: 4 } },
    }
  },
  useMutation: () => [runtime.send, { loading: false }],
}))
beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, "", "/overview")
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

it("loads the digest only on opening and emails only after the explicit email action", async () => {
  render(<SalesDigestAction />)
  expect(runtime.query).not.toHaveBeenCalled()
  expect(screen.queryByText("Email yesterday's digest")).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Open sales digest" }))
  const sheet = screen.getByRole("dialog", { name: "Sales digest" })
  expect(within(sheet).getByText(/GHS\s*125\.50/)).toBeTruthy()
  expect(runtime.send).not.toHaveBeenCalled()
  fireEvent.click(
    within(sheet).getByRole("button", { name: "Email yesterday's digest" })
  )
  await waitFor(() => expect(runtime.send).toHaveBeenCalledOnce())
  await waitFor(() => expect(runtime.refetch).toHaveBeenCalledOnce())
  window.history.back()
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
})
