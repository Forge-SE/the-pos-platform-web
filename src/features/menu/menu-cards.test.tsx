// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MenuManagement } from "./menu-management"
import type { MenuItem, ModifierGroup } from "./model"

const fixture = vi.hoisted(() => ({
  menuCategories: [{ id: "mains", name: "Mains", sortOrder: 0 }],
  menuItems: [
    {
      id: "meal",
      name: "Grilled gizzard",
      description: "Smoky gizzard with garnish",
      price: 2500,
      preparationTimeMinutes: 20,
      categoryId: "mains",
      active: true,
      imageUrl: null,
      modifierGroups: [{ id: "extras", name: "Extras" }],
    },
  ],
  modifierGroups: [
    {
      id: "extras",
      name: "Extras",
      minSelections: 0,
      maxSelections: 2,
      options: [
        {
          id: "chicken",
          name: "Extra chicken",
          priceDelta: 500,
          active: true,
          imageUrl: null,
        },
      ],
    },
  ],
}))
vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({ data: fixture, loading: false, refetch: vi.fn() }),
  useMutation: () => [vi.fn(), { loading: false }],
}))
vi.mock("@/lib/auth-token", () => ({
  getAccessTokenProfile: () => ({ role: "OWNER" }),
}))
vi.mock("@/lib/permissions", () => ({ hasPermission: () => true }))
vi.mock("./modals/add-item-modal", () => ({ AddItemModal: () => null }))
vi.mock("./modals/category-modal", () => ({ CategoryModal: () => null }))
vi.mock("./category-colors", () => ({ CategoryColors: () => null }))
vi.mock("./modals/configure-options-modal", () => ({
  ConfigureOptionsModal: () => null,
}))
vi.mock("./modals/edit-item-modal", () => ({
  EditItemModal: ({
    open,
    item,
    groups,
  }: {
    open: boolean
    item: MenuItem | null
    groups: ModifierGroup[]
  }) =>
    open && item ? (
      <div role="dialog">
        {groups
          .filter((group) =>
            item.modifierGroups.some((attached) => attached.id === group.id)
          )
          .flatMap((group) =>
            group.options.map((option) => (
              <span key={option.id}>{option.name}</span>
            ))
          )}
      </div>
    ) : null,
}))
afterEach(() => {
  cleanup()
  window.history.replaceState(null, "", "/")
})

describe("meal card representation", () => {
  it("uses a preparation tag without choice tags, while preserving choices in the editor", () => {
    render(<MenuManagement />)
    expect(screen.getByText("20 min").getAttribute("data-slot")).toBe("badge")
    expect(screen.queryByText("Extra chicken")).toBeNull()
    expect(screen.queryByText("Extras")).toBeNull()
    expect(screen.queryByText(/Usual prep:/)).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    expect(screen.getByRole("dialog").textContent).toContain("Extra chicken")
  })
})
