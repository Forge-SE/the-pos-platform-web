import { useQuery } from "@apollo/client/react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Input } from "@/components/ui/input"
import { OpsHeader } from "@/features/ops/ops-shell"
import {
  AUDIT_LOGS_QUERY,
  PAGE_SIZE,
  formatWhen,
} from "@/features/ops/ops-model"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { opsAuthContext } from "@/lib/ops-token"
import { useTablePagination } from "@/lib/table-state"
import { useUrlState } from "@/lib/url-state"

interface AuditEntry {
  id: string
  restaurantId: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string | null
  createdAt: string
}

export function OpsAudit({
  restaurantId: fixedRestaurantId,
  embedded = false,
}: { restaurantId?: string; embedded?: boolean } = {}) {
  const [restaurantId, setRestaurantId] = useUrlState("auditRestaurant")
  const [action, setAction] = useUrlState("auditAction")
  const paging = useTablePagination("audit", PAGE_SIZE)

  const { data, loading, error, refetch } = useQuery<
    { platformAuditLogs: { items: AuditEntry[]; total: number } },
    {
      restaurantId: string | null
      action: string | null
      limit: number
      offset: number
    }
  >(AUDIT_LOGS_QUERY, {
    variables: {
      restaurantId: fixedRestaurantId ?? (restaurantId?.trim() || null),
      action: action?.trim() || null,
      limit: paging.pageSize,
      offset: paging.pageIndex * paging.pageSize,
    },
    context: opsAuthContext(),
  })
  useOpsAuthError(error)

  const items = data?.platformAuditLogs.items ?? []
  const total = data?.platformAuditLogs.total ?? 0

  return (
    <>
      {!embedded && (
        <OpsHeader
          title="Audit log"
          description="Provisioning, staff changes, and other platform activity. This record is append-only."
        />
      )}
      <section
        className={`content-region overflow-hidden rounded-md bg-card ${embedded ? "" : "mx-4 mb-8 lg:mx-8 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"}`}
      >
        <DataTable
          ariaLabel="Platform audit log"
          rows={items}
          search={{
            value: action ?? "",
            onChange: (value) => {
              setAction(value || null)
              paging.resetPage()
            },
            placeholder: "Search actions…",
            label: "Search audit actions",
          }}
          filters={
            !fixedRestaurantId ? (
              <Input
                value={restaurantId ?? ""}
                onChange={(event) => {
                  setRestaurantId(event.target.value || null)
                  paging.resetPage()
                }}
                placeholder="Restaurant ID"
                aria-label="Filter by restaurant ID"
                className="w-48"
              />
            ) : undefined
          }
          onRefresh={() => void refetch()}
          isLoading={loading}
          pagination={{
            ...paging,
            totalCount: total,
            pageSizeOptions: [10, 25, 50, 100],
          }}
        >
          <thead className="bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Restaurant</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4}>
                  <LoadingState className="min-h-48" label="audit log" />
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={4}>
                  <ErrorState
                    title="Couldn’t load audit logs."
                    onRetry={refetch}
                  />
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    title="No entries found."
                    description="Platform activity will appear here. Clear the filters to see all entries."
                    action={
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setRestaurantId(null)
                          setAction(null)
                          paging.resetPage()
                          void refetch().catch(() => {})
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                </td>
              </tr>
            )}
            {!error &&
              items.map((entry) => (
                <tr key={entry.id} className="border-t border-border/70">
                  <td className="px-4 py-3 font-medium">{entry.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.entityType}
                    {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {entry.restaurantId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatWhen(entry.createdAt)}
                  </td>
                </tr>
              ))}
          </tbody>
        </DataTable>
      </section>
    </>
  )
}
