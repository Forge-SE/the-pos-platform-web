// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react"
import { DataTable } from "@/components/ui/data-table"
import { useUrlState } from "@/lib/url-state"

beforeEach(() => {
  window.history.replaceState(null, "", "/team")
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it("uses explicit field roles for mobile hierarchy without relying on English labels", () => {
  const open = vi.fn()
  render(
    <DataTable
      ariaLabel="Commandes"
      rows={[{ id: "one" }]}
      getRowId={(row) => row.id}
      columns={[
        {
          id: "ticket",
          header: "Ticket",
          mobileRole: "identity",
          cell: () => "B0001",
        },
        {
          id: "status",
          header: "État",
          mobileRole: "status",
          cell: () => "Prête",
        },
        {
          id: "total",
          header: "Montant",
          mobileRole: "amount",
          cell: () => "GHS 125.50",
        },
        {
          id: "creator",
          header: "Créé par",
          mobileRole: "detail",
          cell: () => "Ama",
        },
        {
          id: "action",
          header: "",
          mobileRole: "actions",
          cell: () => <button onClick={open}>Ouvrir</button>,
        },
      ]}
    />
  )
  const row = screen.getByText("B0001").closest("tr")!
  expect(row.className).toContain("mobile-table-designed")
  expect(
    screen
      .getByText("GHS 125.50")
      .closest("td")
      ?.getAttribute("data-mobile-field")
  ).toBe("amount")
  expect(
    screen.getByText("Ama").closest("td")?.getAttribute("data-mobile-field")
  ).toBe("detail")
  expect(within(row).getAllByRole("cell")).toHaveLength(5)
  fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }))
  expect(open).toHaveBeenCalledOnce()
})

it("allows comparison tables to opt into horizontal scrolling instead of records", () => {
  render(
    <DataTable
      mobilePresentation="scroll"
      ariaLabel="Comparison"
      rows={[{ id: "rice" }]}
    >
      <thead>
        <tr>
          <th>Item</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Rice</td>
          <td>GHS 20.00</td>
        </tr>
      </tbody>
    </DataTable>
  )
  expect(screen.getByRole("table").className).not.toContain(
    "mobile-record-table"
  )
  expect(screen.getByText("GHS 20.00")).toBeTruthy()
  expect(document.querySelector(".mobile-table-label")).toBeNull()
})

it("adapts legacy table rows without dropping fields, row actions or keyboard access", () => {
  const select = vi.fn()
  const action = vi.fn()
  render(
    <DataTable ariaLabel="Staff" rows={[{ id: "ama" }]}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr onClick={select}>
          <td>Ama</td>
          <td className="hidden sm:table-cell">Cashier</td>
          <td>
            <button
              onClick={(event) => {
                event.stopPropagation()
                action()
              }}
            >
              Edit Ama
            </button>
          </td>
        </tr>
      </tbody>
    </DataTable>
  )
  const table = screen.getByRole("table")
  expect(table.className).toContain("mobile-record-table")
  expect(within(table).getByText("Cashier")).toBeTruthy()
  const row = screen.getByText("Ama").closest("tr")!
  fireEvent.keyDown(row, { key: "Enter" })
  expect(select).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole("button", { name: "Edit Ama" }))
  expect(action).toHaveBeenCalledOnce()
  expect(select).toHaveBeenCalledOnce()
})

it("keeps filters usable in a sheet and pagination available on an empty current page", async () => {
  const next = vi.fn()
  const filter = vi.fn()
  function StatusFilter() {
    const [status, setStatus] = useUrlState("status")
    return (
      <label>
        Status
        <select
          aria-label="Status"
          value={status ?? "All"}
          onChange={(event) => {
            setStatus(event.target.value)
            filter()
          }}
        >
          <option>All</option>
          <option>Ready</option>
        </select>
      </label>
    )
  }
  render(
    <DataTable
      ariaLabel="Orders"
      rows={[]}
      columns={[{ id: "name", header: "Name", cell: () => "" }]}
      filters={<StatusFilter />}
      pagination={{
        pageIndex: 2,
        pageSize: 10,
        totalCount: 40,
        onPageChange: next,
        onPageSizeChange: vi.fn(),
      }}
    />
  )
  expect(screen.queryByRole("combobox", { name: "Status" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: "Filters" }))
  expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy()
  fireEvent.change(screen.getByRole("combobox", { name: "Status" }), {
    target: { value: "Ready" },
  })
  expect(filter).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole("button", { name: "Show results" }))
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  expect(window.location.search).toContain("status=Ready")
  expect(window.location.search).not.toContain("mobilePanel")
  fireEvent.click(screen.getByRole("button", { name: "Next page" }))
  expect(next).toHaveBeenCalledWith(3)
})

it("adapts declarative cells and keeps full empty/error content", () => {
  const { rerender } = render(
    <DataTable
      ariaLabel="Customers"
      rows={[{ id: "one", name: "Ama", phone: "0240000000" }]}
      getRowId={(row) => row.id}
      columns={[
        { id: "name", header: "Name", cell: (row) => row.name },
        { id: "phone", header: "Phone", cell: (row) => row.phone },
      ]}
    />
  )
  expect(screen.getByText("0240000000")).toBeTruthy()
  expect(screen.getAllByRole("cell")).toHaveLength(2)
  rerender(
    <DataTable
      ariaLabel="Customers"
      rows={[]}
      columns={[{ id: "name", header: "Name", cell: () => "" }]}
      errorState={<p role="alert">Cannot load customers</p>}
    />
  )
  expect(screen.getByRole("alert").textContent).toBe("Cannot load customers")
  expect(screen.queryByText("0240000000")).toBeNull()
})
