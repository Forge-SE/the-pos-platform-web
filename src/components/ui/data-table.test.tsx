// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { DataTable } from "./data-table"

afterEach(cleanup)

describe("DataTable", () => {
  it("renders the shared searchable and paginated table contract", () => {
    const onSearch = vi.fn()
    const onRefresh = vi.fn()
    const onPageChange = vi.fn()

    render(
      <DataTable
        rows={[{ id: "rice", name: "Rice" }]}
        columns={[
          {
            id: "name",
            header: "Name",
            cell: (row) => row.name,
          },
        ]}
        getRowId={(row) => row.id}
        ariaLabel="Stock items"
        search={{ value: "", onChange: onSearch, placeholder: "Find stock" }}
        onRefresh={onRefresh}
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          totalCount: 12,
          onPageChange,
          onPageSizeChange: vi.fn(),
        }}
      />
    )

    expect(screen.getByRole("table", { name: "Stock items" })).toBeTruthy()
    expect(screen.getByText("Rice")).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "rice" },
    })
    expect(onSearch).toHaveBeenCalledWith("rice")
    fireEvent.click(screen.getByRole("button", { name: "Refresh Stock items" }))
    expect(onRefresh).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(onPageChange).toHaveBeenCalledWith(1)
    expect(screen.getByText("Showing 1 to 1 out of 12")).toBeTruthy()
  })

  it("gives migrated table markup the shared search and pagination controls", () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        ariaLabel="Audit log"
        rows={[{ id: "entry" }]}
        search={{ value: "", onChange: vi.fn() }}
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          totalCount: 20,
          onPageChange,
          onPageSizeChange: vi.fn(),
        }}
      >
        <thead>
          <tr>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>staff.created</td>
          </tr>
        </tbody>
      </DataTable>
    )

    expect(screen.getByRole("table", { name: "Audit log" })).toBeTruthy()
    expect(
      screen.getByRole("region", { name: "Audit log table scroll area" })
    ).toBeTruthy()
    expect(screen.getByRole("searchbox")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
