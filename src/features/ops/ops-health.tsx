import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { ArrowClockwiseIcon } from "@phosphor-icons/react"

import { ErrorState } from "@/components/content-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import type { DataTableColumn } from "@/components/ui/data-table"
import { OpsHeader } from "@/features/ops/ops-shell"
import { opsAuthContext } from "@/lib/ops-token"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { useTablePagination } from "@/lib/table-state"

const HEALTH_QUERY = gql`
  query PlatformPilotHealth {
    platformPilotHealth {
      restaurantId
      name
      lastActiveAt
      orders24h
      offlineSyncLagSeconds
      paymentAttempts24h
      paymentFailures24h
      smsFailures24h
      errorRateBps
    }
  }
`

function lag(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 90) return `${minutes} min`
  return `${Math.round(minutes / 60)} h`
}

export function OpsHealth() {
  const paging = useTablePagination("pilotHealth", 20, [10, 20, 50])
  const { data, loading, error, refetch } = useQuery<{
    platformPilotHealth: Array<{
      restaurantId: string
      name: string
      lastActiveAt: string | null
      orders24h: number
      offlineSyncLagSeconds: number
      paymentAttempts24h: number
      paymentFailures24h: number
      smsFailures24h: number
      errorRateBps: number
    }>
  }>(HEALTH_QUERY, { context: opsAuthContext(), fetchPolicy: "network-only" })
  useOpsAuthError(error)
  type HealthRow = NonNullable<typeof data>["platformPilotHealth"][number]
  const allRows = data?.platformPilotHealth ?? []
  const pageIndex = Math.min(
    paging.pageIndex,
    Math.max(0, Math.ceil(allRows.length / paging.pageSize) - 1)
  )
  const columns: DataTableColumn<HealthRow>[] = [
    {
      id: "restaurant",
      header: "Restaurant",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "lastActive",
      header: "Last active",
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.lastActiveAt
            ? new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(row.lastActiveAt))
            : "No orders yet"}
        </span>
      ),
    },
    { id: "orders", header: "Orders 24h", cell: (row) => row.orders24h },
    {
      id: "syncLag",
      header: "Sync lag",
      cell: (row) => lag(row.offlineSyncLagSeconds),
    },
    {
      id: "paymentFailures",
      header: "Payment failures",
      cell: (row) => (
        <>
          {row.paymentFailures24h}
          <span className="text-muted-foreground">
            {" "}
            / {row.paymentAttempts24h}
          </span>
        </>
      ),
    },
    {
      id: "smsFailures",
      header: "SMS failures",
      cell: (row) => row.smsFailures24h,
    },
    {
      id: "errorRate",
      header: "Error rate",
      cell: (row) => (
        <StatusBadge tone={row.errorRateBps > 1000 ? "warning" : "success"}>
          {(row.errorRateBps / 100).toFixed(1)}%
        </StatusBadge>
      ),
    },
  ]

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <OpsHeader
        title="Pilot health"
        description="Last activity, today's orders, offline sync lag, and payment or SMS failures across restaurants."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={loading}
        >
          <ArrowClockwiseIcon data-icon="inline-start" />
          Refresh
        </Button>
      </OpsHeader>
      <section className="flex min-h-[calc(100svh-11rem)] min-w-0 flex-1 flex-col px-5 pb-6 lg:px-8">
        <DataTable
          mobileFeedMode="window"
          ariaLabel="Pilot health"
          onRetry={() => void refetch()}
          rows={allRows.slice(
            paging.windowStart(pageIndex),
            (pageIndex + 1) * paging.pageSize
          )}
          columns={columns}
          getRowId={(row) => row.restaurantId}
          pagination={{
            pageIndex,
            pageSize: paging.pageSize,
            totalCount: allRows.length,
            onLoadMore: paging.onLoadMore,
            onPageChange: paging.onPageChange,
            onPageSizeChange: paging.onPageSizeChange,
            pageSizeOptions: [10, 20, 50],
          }}
          isLoading={loading && !data}
          errorState={
            error ? (
              <ErrorState
                title="Could not load pilot health."
                onRetry={() => void refetch()}
              />
            ) : undefined
          }
          emptyState="No active restaurants to monitor yet."
        />
      </section>
    </div>
  )
}
