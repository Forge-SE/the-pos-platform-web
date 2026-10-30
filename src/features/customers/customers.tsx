import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"

import { SectionPage } from "@/components/layout/section-page"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatMoney } from "@/features/menu/model"
import { useTablePagination } from "@/lib/table-state"
import { useUrlState } from "@/lib/url-state"

const CUSTOMERS_QUERY = gql`
  query CustomerDirectory($search: String, $limit: Int, $offset: Int) {
    customers(search: $search, limit: $limit, offset: $offset) {
      id
      name
      phone
      consentStatus
      source
      orderCount
      lastOrderAt
    }
    customersCount(search: $search)
  }
`

const HISTORY_QUERY = gql`
  query CustomerHistory($customerId: ID!) {
    customerOrders(customerId: $customerId) {
      id
      ticketNumber
      status
      total
      createdAt
    }
    customerMessages(customerId: $customerId) {
      id
      kind
      status
      body
      failureReason
      createdAt
    }
  }
`

const OPT_OUT = gql`
  mutation OptOutCustomer($customerId: ID!) {
    optOutCustomer(customerId: $customerId) {
      id
      consentStatus
      optedOutAt
    }
  }
`

interface Customer {
  id: string
  name: string
  phone: string
  consentStatus: string
  source: string
  orderCount: number
  lastOrderAt: string | null
}

interface History {
  customerOrders: Array<{
    id: string
    ticketNumber: string
    status: string
    total: number
    createdAt: string
  }>
  customerMessages: Array<{
    id: string
    kind: string
    status: string
    body: string
    failureReason: string | null
    createdAt: string
  }>
}

function dateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en-GH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"
}

export function Customers() {
  const [searchParam, setSearch] = useUrlState("customersSearch")
  const [selected, setSelected] = useState<Customer | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const paging = useTablePagination("customers", 20, [10, 20, 50])
  const directory = useQuery<{
    customers: Customer[]
    customersCount: number
  }>(CUSTOMERS_QUERY, {
    variables: {
      search: searchParam?.trim() || null,
      limit: paging.pageSize,
      offset: paging.pageIndex * paging.pageSize,
    },
    fetchPolicy: "network-only",
  })
  const history = useQuery<History>(HISTORY_QUERY, {
    variables: { customerId: selected?.id ?? "" },
    skip: !selected,
    fetchPolicy: "network-only",
  })
  const [optOut, { loading: optingOut }] = useMutation(OPT_OUT)

  async function stopMessages() {
    if (!selected) return
    setActionError(null)
    try {
      await optOut({ variables: { customerId: selected.id } })
      setSelected({ ...selected, consentStatus: "denied" })
      await directory.refetch()
    } catch {
      setActionError("Could not stop messages. Please try again.")
    }
  }

  return (
    <SectionPage
      title="Customers"
      description="Contact details, order history, and order-ready message status."
      fillHeight
    >
      <div className="content-region mt-6 overflow-hidden rounded-md lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <DataTable
          ariaLabel="Customers"
          rows={directory.data?.customers ?? []}
          getRowId={(row) => row.id}
          search={{
            value: searchParam ?? "",
            onChange: (value) => {
              setSearch(value || null)
              paging.resetPage()
            },
            placeholder: "Search name or phone",
          }}
          onRefresh={() => void directory.refetch()}
          isLoading={directory.loading && !directory.data}
          isFetching={directory.loading && Boolean(directory.data)}
          errorState={directory.error ? "Could not load customers." : undefined}
          emptyState="No customers found. Customers appear after they agree to save a contact number at checkout."
          pagination={{
            ...paging,
            totalCount: directory.data?.customersCount ?? 0,
          }}
          columns={[
            {
              id: "name",
              header: "Customer",
              cell: (row) => <span className="font-medium">{row.name}</span>,
            },
            { id: "phone", header: "Phone", cell: (row) => row.phone },
            {
              id: "orders",
              header: "Orders",
              cell: (row) => (
                <span className="tabular-nums">{row.orderCount}</span>
              ),
            },
            {
              id: "last",
              header: "Last order",
              cell: (row) => dateTime(row.lastOrderAt),
            },
            {
              id: "messages",
              header: "Messages",
              cell: (row) => (
                <StatusBadge
                  tone={row.consentStatus === "granted" ? "success" : "neutral"}
                >
                  {row.consentStatus === "granted" ? "Allowed" : "Stopped"}
                </StatusBadge>
              ),
            },
            {
              id: "action",
              header: "",
              cell: (row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(row)}
                >
                  View details
                </Button>
              ),
            },
          ]}
        />
      </div>

      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card text-card-foreground shadow-xl outline-none">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
              <div>
                <Dialog.Title className="text-xl font-semibold">
                  {selected?.name}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {selected?.phone}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close customer details"
                  />
                }
              >
                <XIcon aria-hidden />
              </Dialog.Close>
            </div>
            <div className="content-region flex-1 space-y-7 overflow-y-auto px-5 py-6">
              <section className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-4">
                <div>
                  <p className="text-sm font-medium">Order messages</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected?.consentStatus === "granted"
                      ? "Customer agreed at checkout"
                      : "Messages stopped"}
                  </p>
                </div>
                {selected?.consentStatus === "granted" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={optingOut}
                    onClick={() => void stopMessages()}
                  >
                    {optingOut ? "Stopping…" : "Stop messages"}
                  </Button>
                )}
              </section>
              {actionError && (
                <p role="alert" className="text-sm text-destructive">
                  {actionError}
                </p>
              )}
              {history.loading && !history.data ? (
                <p className="text-sm text-muted-foreground">
                  Loading history…
                </p>
              ) : history.error ? (
                <Button
                  variant="outline"
                  onClick={() => void history.refetch()}
                >
                  Retry history
                </Button>
              ) : (
                <>
                  <section>
                    <h2 className="text-base font-semibold">Recent orders</h2>
                    <ul className="mt-3 divide-y divide-border/60">
                      {history.data?.customerOrders.length ? (
                        history.data.customerOrders.map((order) => (
                          <li
                            key={order.id}
                            className="flex items-center justify-between gap-3 py-3 text-sm"
                          >
                            <span>
                              <span className="block font-medium">
                                #{order.ticketNumber} ·{" "}
                                {order.status.toLowerCase()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {dateTime(order.createdAt)}
                              </span>
                            </span>
                            <span className="font-semibold tabular-nums">
                              {formatMoney(order.total)}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="py-3 text-sm text-muted-foreground">
                          No orders yet.
                        </li>
                      )}
                    </ul>
                  </section>
                  <section>
                    <h2 className="text-base font-semibold">Message history</h2>
                    <ul className="mt-3 divide-y divide-border/60">
                      {history.data?.customerMessages.length ? (
                        history.data.customerMessages.map((message) => (
                          <li key={message.id} className="py-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                Order ready · {message.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {dateTime(message.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-muted-foreground">
                              {message.body}
                            </p>
                            {message.failureReason && (
                              <p className="mt-1 text-xs text-destructive">
                                {message.failureReason}
                              </p>
                            )}
                          </li>
                        ))
                      ) : (
                        <li className="py-3 text-sm text-muted-foreground">
                          No messages yet.
                        </li>
                      )}
                    </ul>
                  </section>
                </>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </SectionPage>
  )
}
