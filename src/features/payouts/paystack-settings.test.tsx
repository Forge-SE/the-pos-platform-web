// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { PaystackSettings } from "./paystack-settings"
import type { PaystackSettingsData } from "./paystack-settings"

const runtime = vi.hoisted(() => {
  const settings: PaystackSettingsData["paystackSettings"] = {
    configured: true,
    mode: "test",
    account: null,
  }
  return {
    settings,
    mutations: vi.fn(),
    queries: vi.fn(),
    toast: vi.fn(),
    refetch: vi.fn(),
  }
})
vi.mock("@apollo/client/react", () => ({
  useQuery: (
    doc: { definitions: Array<{ name?: { value: string } }> },
    options: unknown
  ) => {
    runtime.queries(doc.definitions[0].name?.value, options)
    return {
      data:
        doc.definitions[0].name?.value === "PaystackSettings"
          ? { paystackSettings: runtime.settings }
          : {
              paystackBanks: [
                { name: "Saved bank", code: "001", type: "ghipss" },
              ],
            },
      loading: false,
      error: null,
      refetch: runtime.refetch,
    }
  },
  useMutation: () => [runtime.mutations, { loading: false }],
}))
vi.mock("@/components/ui/toaster", () => ({ toast: runtime.toast }))
vi.mock("@/lib/ops-token", () => ({
  opsAuthContext: () => ({ authScope: "ops" }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  runtime.settings = { configured: true, mode: "test", account: null }
  runtime.mutations.mockResolvedValue({})
  runtime.refetch.mockResolvedValue({})
})
afterEach(cleanup)
describe("restaurant Paystack settings", () => {
  it("explains missing configuration and offers no provider mutations", () => {
    runtime.settings.configured = false
    render(<PaystackSettings />)
    expect(screen.getByText(/Paystack is not configured/)).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Set up settlement" })
    ).toBeNull()
    expect(runtime.mutations).not.toHaveBeenCalled()
  })
  it("submits the destination with restaurant scope and keeps owner fee controls unavailable", async () => {
    render(<PaystackSettings />)
    fireEvent.click(screen.getByRole("button", { name: "Set up settlement" }))
    expect(screen.queryByLabelText("Platform share (%)")).toBeNull()
    fireEvent.change(screen.getByLabelText("Business name"), {
      target: { value: "Kitchen" },
    })
    fireEvent.change(screen.getByLabelText("Settlement contact email"), {
      target: { value: "owner@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Bank or mobile money provider"), {
      target: { value: "001" },
    })
    fireEvent.change(screen.getByLabelText("Account number"), {
      target: { value: "0123456789" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Save settlement account" })
    )
    await waitFor(() =>
      expect(runtime.mutations).toHaveBeenCalledWith({
        variables: {
          restaurantId: undefined,
          input: {
            businessName: "Kitchen",
            contactEmail: "owner@example.com",
            bankCode: "001",
            accountNumber: "0123456789",
          },
        },
      })
    )
    await waitFor(() =>
      expect(runtime.toast).toHaveBeenCalledWith({
        title: "Settlement account saved.",
        status: "success",
      })
    )
  })
  it("uses the admin auth scope and shows fee management only for an explicit restaurant", () => {
    render(<PaystackSettings restaurantId="restaurant-123" />)
    fireEvent.click(screen.getByRole("button", { name: "Set up settlement" }))
    expect(screen.getByLabelText("Platform share (%)")).toBeTruthy()
    expect(runtime.queries).toHaveBeenCalledWith(
      "PaystackSettings",
      expect.objectContaining({
        variables: { restaurantId: "restaurant-123" },
        context: { authScope: "ops" },
      })
    )
  })
  it("blocks setup retries while allowing code recovery after an interrupted create", () => {
    runtime.settings.account = {
      code: null,
      domain: "test",
      businessName: "Kitchen",
      bankCode: "001",
      bankName: null,
      accountLast4: "6789",
      accountName: null,
      contactEmail: "owner@example.com",
      platformShareBps: 0,
      feeBearer: "subaccount",
      active: false,
      verified: false,
      syncState: "REVIEW_REQUIRED",
      syncedAt: null,
    }
    render(<PaystackSettings />)
    expect(
      screen
        .getByRole("button", {
          name: "Set up settlement",
        })
        .hasAttribute("disabled")
    ).toBe(true)
    fireEvent.click(
      screen.getByRole("button", { name: "Link existing subaccount" })
    )
    expect(screen.getByLabelText("Paystack subaccount code")).toBeTruthy()
  })
})
