// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { InventoryManagement } from "./inventory-management"
import type { DocumentNode } from "graphql"

const state = vi.hoisted(() => ({
  record: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
  refetch: vi.fn(),
  permissions: ["INVENTORY_VIEW", "INVENTORY_MANAGE"],
  error: undefined as Error | undefined,
  reviewRequired: false,
  hasMovements: false,
}))
const stock = {
  id: "rice",
  name: "Rice",
  unit: "g",
  onHand: 1000,
  reserved: 100,
  available: 900,
  reorderLevel: 200,
  version: 4,
}
vi.mock("@apollo/client/react", () => ({
  useQuery: (document: DocumentNode) => {
    const operation = document.definitions.find(
      (def) => def.kind === "OperationDefinition"
    )
    const name =
      operation?.kind === "OperationDefinition" ? operation.name?.value : ""
    const data =
      name === "InventoryStock"
        ? {
            inventoryItems: [
              { ...stock, countReviewRequired: state.reviewRequired },
            ],
          }
        : name === "InventoryMeals"
          ? {
              menuItems: [
                { id: "meal", name: "Rice meal", modifierGroups: [] },
              ],
            }
          : name === "InventoryRecipe"
            ? {
                inventoryRecipe: {
                  id: "recipe",
                  menuItemId: "meal",
                  version: 1,
                  enabled: true,
                  lines: [
                    {
                      stockItemId: "rice",
                      modifierOptionId: null,
                      quantity: 100,
                    },
                  ],
                },
              }
            : {
                inventoryHistory: {
                  total: state.hasMovements ? 1 : 0,
                  items: state.hasMovements
                    ? [
                        {
                          id: "movement",
                          createdAt: "2026-10-16T10:00:00Z",
                          actorName: "Manager",
                          stockName: "Rice",
                          kind: "RECEIPT",
                          quantity: 100,
                          unit: "g",
                          onHandDelta: 100,
                          reservedDelta: 0,
                          balanceAfter: 100,
                          reason: "Opening stock",
                        },
                      ]
                    : [],
                },
              }
    return { data, loading: false, error: state.error, refetch: state.refetch }
  },
  useMutation: (document: DocumentNode) => {
    const operation = document.definitions.find(
      (def) => def.kind === "OperationDefinition"
    )
    const name =
      operation?.kind === "OperationDefinition" ? operation.name?.value : ""
    return [
      name === "RecordInventoryMovement"
        ? state.record
        : name === "CreateInventoryItem"
          ? state.create
          : state.save,
      { loading: false },
    ]
  },
}))
vi.mock("@/lib/auth-token", () => ({
  getAccessTokenProfile: () => ({
    role: "MANAGER",
    permissions: state.permissions,
  }),
}))
vi.mock("@/components/ui/toaster", () => ({ toast: vi.fn() }))
vi.mock("@tanstack/react-router", () => ({
  Navigate: () => <div>Not permitted</div>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  state.permissions = ["INVENTORY_VIEW", "INVENTORY_MANAGE"]
  state.error = undefined
  state.reviewRequired = false
  state.hasMovements = false
  state.record.mockResolvedValue({
    data: { recordInventoryMovement: { kind: "RECEIPT" } },
  })
  window.history.replaceState(null, "", "/inventory")
})
afterEach(cleanup)
describe("inventory workspace", () => {
  it("keeps movement-history guidance in an info popover", async () => {
    state.hasMovements = true
    window.history.replaceState(null, "", "/inventory?inventoryTab=movements")
    render(<InventoryManagement />)
    expect(
      screen.getByRole("heading", { name: "Movement history" })
    ).toBeTruthy()
    expect(screen.queryByText(/Append-only history/)).toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: "About movement history" })
    )
    expect(
      await screen.findByText(/Negative count variance is a discrepancy/)
    ).toBeTruthy()
  })
  it("flags stock needing a count review instead of presenting it as in stock", () => {
    state.reviewRequired = true
    render(<InventoryManagement />)
    expect(screen.getByText("Count review required")).toBeTruthy()
    expect(screen.queryByText("In stock")).toBeNull()
  })
  it("shows real balances and stock actions without fabricated sample data", () => {
    render(<InventoryManagement />)
    expect(screen.getByText("Rice")).toBeTruthy()
    expect(screen.getByText("1,000 g")).toBeTruthy()
    expect(screen.getByText("900 g")).toBeTruthy()
    expect(
      screen.getByRole("img", {
        name: "900 g available and 100 g reserved out of 1,000 g on hand",
      })
    ).toBeTruthy()
    expect(screen.getByText("700 g above reorder point")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Receive Rice" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Meal recipes" })).toBeTruthy()
  })
  it("records receipts and retries the same immutable request after an ambiguous error", async () => {
    state.record.mockRejectedValueOnce(new Error("Connection lost"))
    render(<InventoryManagement />)
    fireEvent.click(screen.getByRole("button", { name: "Receive Rice" }))
    fireEvent.change(screen.getByLabelText("Quantity (g)"), {
      target: { value: "25.125" },
    })
    fireEvent.change(
      screen.getByLabelText("Supplier / delivery / opening-stock reference"),
      { target: { value: "Supplier invoice 12" } }
    )
    fireEvent.click(screen.getByRole("button", { name: "Record" }))
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Connection lost")
    )
    expect(screen.getByLabelText("Quantity (g)").hasAttribute("readonly")).toBe(
      true
    )
    fireEvent.click(screen.getByRole("button", { name: "Retry same request" }))
    await waitFor(() => expect(state.record).toHaveBeenCalledTimes(2))
    expect(state.record.mock.calls[0][0]).toEqual(state.record.mock.calls[1][0])
    expect(state.record.mock.calls[0][0].variables.input).toMatchObject({
      stockItemId: "rice",
      quantity: 25.125,
      reason: "Supplier invoice 12",
    })
  })
  it("leaves physical counts blank and submits the captured stock version", async () => {
    render(<InventoryManagement />)
    fireEvent.click(screen.getByRole("button", { name: "Count Rice" }))
    const dialog = screen.getByRole("dialog")
    expect(within(dialog).queryByText("1,000 g")).toBeNull()
    expect(
      screen.getByLabelText("Physical count (g)").getAttribute("value")
    ).toBe("")
    fireEvent.change(screen.getByLabelText("Physical count (g)"), {
      target: { value: "950" },
    })
    fireEvent.change(screen.getByLabelText("Reason or count note"), {
      target: { value: "Closing physical count" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Record" }))
    await waitFor(() =>
      expect(state.record).toHaveBeenCalledWith({
        variables: {
          input: expect.objectContaining({
            kind: "COUNT",
            quantity: 950,
            expectedVersion: 4,
          }),
        },
      })
    )
  })
  it("keeps recipe explanations in accessible info popovers", async () => {
    window.history.replaceState(
      null,
      "",
      "/inventory?inventoryTab=recipes&recipeMeal=meal"
    )
    render(<InventoryManagement />)
    expect(screen.getByText("Version 1")).toBeTruthy()
    expect(
      screen.getByRole("checkbox", {
        name: "Track inventory for this meal",
      })
    ).toBeTruthy()
    expect(screen.getByRole("textbox", { name: "Search meals" })).toBeTruthy()
    expect(screen.getByText("Quantity per serving")).toBeTruthy()
    expect(screen.queryByText(/Quantities per serving/)).toBeNull()
    expect(screen.queryByText(/Saving creates a new version/)).toBeNull()
    const quantities = screen.getByRole("button", {
      name: "About recipe quantities",
    })
    quantities.focus()
    expect(document.activeElement).toBe(quantities)
    fireEvent.click(quantities)
    expect(await screen.findByText(/Quantities per serving/)).toBeTruthy()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    fireEvent.click(
      screen.getByRole("button", { name: "About inventory tracking" })
    )
    expect(await screen.findByText(/Existing orders keep their/)).toBeTruthy()
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    fireEvent.click(
      screen.getByRole("button", { name: "About saving recipe versions" })
    )
    expect(await screen.findByText(/Saving creates a new version/)).toBeTruthy()
  })
  it("versions recipes from URL-backed meal selection", async () => {
    window.history.replaceState(
      null,
      "",
      "/inventory?inventoryTab=recipes&recipeMeal=meal"
    )
    render(<InventoryManagement />)
    expect(screen.getByText("Rice meal", { selector: "h2" })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Quantity 1 (g)"), {
      target: { value: "125" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save recipe version" }))
    await waitFor(() =>
      expect(state.save).toHaveBeenCalledWith({
        variables: {
          input: expect.objectContaining({
            menuItemId: "meal",
            expectedVersion: 1,
            enabled: true,
            lines: [
              { stockItemId: "rice", modifierOptionId: null, quantity: 125 },
            ],
          }),
        },
      })
    )
  })
  it("hides write controls from inventory viewers and respects query errors", () => {
    state.permissions = ["INVENTORY_VIEW"]
    const { rerender } = render(<InventoryManagement />)
    expect(screen.queryByRole("button", { name: "Receive Rice" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Add stock item" })).toBeNull()
    state.error = new Error("Offline")
    rerender(<InventoryManagement />)
    expect(screen.getByText("Couldn’t load inventory")).toBeTruthy()
    expect(screen.queryByText("Rice")).toBeNull()
  })
})
