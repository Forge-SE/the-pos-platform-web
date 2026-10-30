// @vitest-environment jsdom
import { useState } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { DataTable } from "@/components/ui/data-table"
import { useTablePagination } from "@/lib/table-state"

type Item = { id: string; name: string }
const observers = new Set<{
  callback: IntersectionObserverCallback
  options?: IntersectionObserverInit
}>()
beforeEach(() => {
  observers.clear()
  window.history.replaceState(null, "", "/customers")
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionObserverCallback
      options?: IntersectionObserverInit
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit
      ) {
        this.callback = callback
        this.options = options
      }
      observe() {
        observers.add(this)
      }
      disconnect() {
        observers.delete(this)
      }
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
const nearEnd = () =>
  act(() => {
    for (const observer of [...observers])
      observer.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
  })
const first: Item[] = [
  { id: "a", name: "Ama" },
  { id: "b", name: "Kojo" },
]
const columns = [
  { id: "name", header: "Customer", cell: (item: Item) => item.name },
]

it("prefetches near the end, keeps loaded rows through loading, deduplicates batches and stops at the end", () => {
  const load = vi.fn()
  const paging = {
    pageIndex: 0,
    pageSize: 2,
    hasNextPage: true,
    onPageChange: load,
    onLoadMore: load,
    onPageSizeChange: vi.fn(),
  }
  const view = render(
    <DataTable
      ariaLabel="Customers"
      rows={first}
      getRowId={(item) => item.id}
      columns={columns}
      pagination={paging}
    />
  )
  expect(
    screen.queryByRole("navigation", { name: "Customers pagination" })
  ).toBeNull()
  expect([...observers][0].options?.rootMargin).toBe("0px 0px 400px 0px")
  nearEnd()
  nearEnd()
  expect(load).toHaveBeenCalledExactlyOnceWith(1)
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      rows={[]}
      getRowId={(item) => item.id}
      columns={columns}
      isLoading
      pagination={{ ...paging, pageIndex: 1 }}
    />
  )
  expect(screen.getByText("Ama")).toBeTruthy()
  expect(screen.getByText("Loading more…")).toBeTruthy()
  nearEnd()
  expect(load).toHaveBeenCalledOnce()
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      rows={[
        { id: "b", name: "Kojo updated" },
        { id: "c", name: "Esi" },
      ]}
      getRowId={(item) => item.id}
      columns={columns}
      pagination={{ ...paging, pageIndex: 1, hasNextPage: false }}
    />
  )
  expect(screen.getByText("Ama")).toBeTruthy()
  expect(screen.getAllByText("Kojo updated")).toHaveLength(1)
  expect(screen.queryByText("Kojo")).toBeNull()
  expect(screen.getByText("Esi")).toBeTruthy()
  nearEnd()
  expect(load).toHaveBeenCalledOnce()
  expect(screen.getByText("You’re all caught up")).toBeTruthy()
})

it("retains older legacy row controls when appending another page", () => {
  const select = vi.fn()
  const paging = {
    pageIndex: 0,
    pageSize: 2,
    totalCount: 4,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  }
  const content = (items: Item[]) => (
    <>
      <thead>
        <tr>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <button onClick={() => select(item.id)}>{item.name}</button>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  )
  const view = render(
    <DataTable ariaLabel="Staff" rows={first} pagination={paging}>
      {content(first)}
    </DataTable>
  )
  view.rerender(
    <DataTable
      ariaLabel="Staff"
      rows={[{ id: "c", name: "Esi" }]}
      pagination={{ ...paging, pageIndex: 1 }}
    >
      {content([{ id: "c", name: "Esi" }])}
    </DataTable>
  )
  expect(screen.getByRole("button", { name: "Ama" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Esi" })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Ama" }))
  expect(select).toHaveBeenCalledExactlyOnceWith("a")
})

it("keeps loaded rows after a failed next batch and retries only on request", () => {
  const retry = vi.fn(),
    load = vi.fn()
  const paging = {
    pageIndex: 0,
    pageSize: 2,
    hasNextPage: true,
    onPageChange: load,
    onPageSizeChange: vi.fn(),
  }
  const view = render(
    <DataTable
      ariaLabel="Customers"
      rows={first}
      columns={columns}
      getRowId={(item) => item.id}
      onRefresh={retry}
      pagination={paging}
    />
  )
  nearEnd()
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      rows={[]}
      columns={columns}
      getRowId={(item) => item.id}
      onRefresh={retry}
      errorState="Offline"
      pagination={{ ...paging, pageIndex: 1 }}
    />
  )
  expect(screen.getByText("Ama")).toBeTruthy()
  expect(screen.getByRole("alert").textContent).toContain(
    "Could not load more items."
  )
  nearEnd()
  nearEnd()
  expect(load).toHaveBeenCalledOnce()
  expect(retry).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(retry).toHaveBeenCalledOnce()
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      rows={[{ id: "c", name: "Esi" }]}
      columns={columns}
      getRowId={(item) => item.id}
      onRefresh={retry}
      pagination={{ ...paging, pageIndex: 1, hasNextPage: false }}
    />
  )
  expect(screen.getByText("Ama")).toBeTruthy()
  expect(screen.getByText("Esi")).toBeTruthy()
})

it("resets the loaded dataset on a filter change rather than mixing records", () => {
  const load = vi.fn()
  const paging = {
    pageIndex: 0,
    pageSize: 2,
    totalCount: 6,
    onPageChange: load,
    onPageSizeChange: vi.fn(),
  }
  const view = render(
    <DataTable
      ariaLabel="Customers"
      mobileFeedKey="all"
      rows={first}
      columns={columns}
      getRowId={(item) => item.id}
      pagination={paging}
    />
  )
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      mobileFeedKey="all"
      rows={[{ id: "c", name: "Esi" }]}
      columns={columns}
      getRowId={(item) => item.id}
      pagination={{ ...paging, pageIndex: 1 }}
    />
  )
  expect(screen.getByText("Ama")).toBeTruthy()
  const previousObserver = [...observers][0]
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      mobileFeedKey="filtered"
      rows={[]}
      columns={columns}
      getRowId={(item) => item.id}
      isLoading
      pagination={paging}
    />
  )
  expect(screen.queryByText("Ama")).toBeNull()
  expect(screen.queryByText("Esi")).toBeNull()
  act(() =>
    previousObserver.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
  )
  expect(load).not.toHaveBeenCalled()
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      mobileFeedKey="filtered"
      rows={[{ id: "z", name: "Abena" }]}
      columns={columns}
      getRowId={(item) => item.id}
      pagination={{ ...paging, totalCount: 1 }}
    />
  )
  expect(screen.getByText("Abena")).toBeTruthy()
  expect(screen.queryByText("Ama")).toBeNull()
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      mobileFeedKey="filtered"
      rows={[{ id: "k", name: "Kwaku" }]}
      columns={columns}
      getRowId={(item) => item.id}
      pagination={{ ...paging, pageIndex: 3, totalCount: 20 }}
    />
  )
  expect(screen.getByText("Kwaku")).toBeTruthy()
  expect(screen.queryByText("Abena")).toBeNull()
})

it("does not automatically loop when a server repeats a batch without adding records", () => {
  const load = vi.fn()
  const paging = {
    pageIndex: 0,
    pageSize: 2,
    hasNextPage: true,
    onPageChange: load,
    onPageSizeChange: vi.fn(),
  }
  const view = render(
    <DataTable
      ariaLabel="Customers"
      rows={first}
      columns={columns}
      getRowId={(item) => item.id}
      pagination={paging}
    />
  )
  view.rerender(
    <DataTable
      ariaLabel="Customers"
      rows={first}
      columns={columns}
      getRowId={(item) => item.id}
      pagination={{ ...paging, pageIndex: 1 }}
    />
  )
  nearEnd()
  nearEnd()
  expect(load).not.toHaveBeenCalled()
  expect(screen.getAllByText("Ama")).toHaveLength(1)
  fireEvent.click(screen.getByRole("button", { name: "Load more" }))
  expect(load).toHaveBeenCalledExactlyOnceWith(2)
})

it("expands fresh local windows without creating Back entries or freezing earlier rows", async () => {
  function Directory() {
    const paging = useTablePagination("customers", 2, [2])
    const [items, setItems] = useState([
      ...first,
      { id: "c", name: "Esi" },
      { id: "d", name: "Abena" },
    ])
    return (
      <>
        <button
          onClick={() =>
            setItems((previous) =>
              previous.map((item) =>
                item.id === "a" ? { ...item, name: "Ama updated" } : item
              )
            )
          }
        >
          Update Ama
        </button>
        <DataTable
          ariaLabel="Customers"
          mobileFeedMode="window"
          rows={items.slice(
            paging.windowStart(),
            (paging.pageIndex + 1) * paging.pageSize
          )}
          columns={columns}
          getRowId={(item) => item.id}
          pagination={{ ...paging, totalCount: items.length }}
        />
      </>
    )
  }
  const historyLength = window.history.length
  render(<Directory />)
  nearEnd()
  await waitFor(() => expect(screen.getByText("Abena")).toBeTruthy())
  expect(window.location.search).toContain("customersPage=2")
  expect(window.history.length).toBe(historyLength)
  fireEvent.click(screen.getByRole("button", { name: "Update Ama" }))
  expect(screen.getByText("Ama updated")).toBeTruthy()
  expect(screen.queryByText("Ama")).toBeNull()
  expect(screen.queryByRole("button", { name: "Next page" })).toBeNull()
})
