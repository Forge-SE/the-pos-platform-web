import { useState } from "react"
import { useQuery } from "@apollo/client/react"

import { Button } from "@/components/ui/button"
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
  const [restaurantId, setRestaurantId] = useState("")
  const [action, setAction] = useState("")
  const [offset, setOffset] = useState(0)

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
      restaurantId: fixedRestaurantId ?? (restaurantId.trim() || null),
      action: action.trim() || null,
      limit: PAGE_SIZE,
      offset,
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
        className={`content-region overflow-hidden rounded-xl border border-border/70 bg-card ${embedded ? "" : "mx-4 mb-8 lg:mx-8"}`}
      >
        <div className="grid gap-3 border-b border-border/70 px-4 py-3 sm:grid-cols-2">
          {!fixedRestaurantId && (
            <Input
              value={restaurantId}
              onChange={(event) => {
                setRestaurantId(event.target.value)
                setOffset(0)
              }}
              placeholder="Filter by restaurant ID"
              aria-label="Filter by restaurant ID"
            />
          )}
          <Input
            value={action}
            onChange={(event) => {
              setAction(event.target.value)
              setOffset(0)
            }}
            placeholder="Filter by action, e.g. staff.created"
            aria-label="Filter by action"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
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
                            setRestaurantId("")
                            setAction("")
                            setOffset(0)
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
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
          <span>
            {total === 0 ? "0" : `${offset + 1}–${offset + items.length}`} of{" "}
            {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() =>
                setOffset((current) => Math.max(0, current - PAGE_SIZE))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + items.length >= total}
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
