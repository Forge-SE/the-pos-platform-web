import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { useNavigate } from "@tanstack/react-router"
import { CheckCircleIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  RestaurantOnboarding,
  type ProvisionedRestaurant,
} from "@/features/onboarding/restaurant-onboarding"
import { clearOpsToken, opsAuthContext } from "@/lib/ops-token"

const PAGE_SIZE = 25

const RESTAURANTS_QUERY = gql`
  query PlatformRestaurants($search: String, $limit: Int, $offset: Int) {
    platformRestaurants(search: $search, limit: $limit, offset: $offset) {
      items {
        id
        name
        slug
        code
        currency
        timezone
        createdAt
      }
      total
    }
  }
`

const RESTAURANT_DETAIL_QUERY = gql`
  query PlatformRestaurant($id: ID!) {
    platformRestaurant(id: $id) {
      restaurant {
        id
        name
        slug
        code
        currency
        timezone
        createdAt
      }
      staff {
        id
        name
        role
        active
      }
      staffCount
      activeStaffCount
    }
    platformAuditLogs(restaurantId: $id, limit: 10) {
      items {
        id
        action
        entityType
        createdAt
      }
      total
    }
  }
`

const AUDIT_LOGS_QUERY = gql`
  query PlatformAuditLogs(
    $restaurantId: ID
    $action: String
    $limit: Int
    $offset: Int
  ) {
    platformAuditLogs(
      restaurantId: $restaurantId
      action: $action
      limit: $limit
      offset: $offset
    ) {
      items {
        id
        restaurantId
        actorId
        action
        entityType
        entityId
        createdAt
      }
      total
    }
  }
`

const SET_STAFF_ACTIVE = gql`
  mutation PlatformSetStaffActive(
    $restaurantId: ID!
    $userId: ID!
    $active: Boolean!
  ) {
    platformSetStaffActive(
      restaurantId: $restaurantId
      userId: $userId
      active: $active
    ) {
      id
      active
    }
  }
`

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export function OpsDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<"restaurants" | "audit" | "new">("restaurants")

  function signOut() {
    clearOpsToken()
    navigate({ to: "/ops/login" })
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Internal
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-[-0.025em]">
            Platform overview
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Restaurant management and audit views. Activity here is logged.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          variant={tab === "restaurants" ? "default" : "outline"}
          onClick={() => setTab("restaurants")}
        >
          Restaurants
        </Button>
        <Button
          variant={tab === "new" ? "default" : "outline"}
          onClick={() => setTab("new")}
        >
          New restaurant
        </Button>
        <Button
          variant={tab === "audit" ? "default" : "outline"}
          onClick={() => setTab("audit")}
        >
          Audit logs
        </Button>
      </div>

      <div className="mt-6">
        {tab === "restaurants" ? (
          <RestaurantsView />
        ) : tab === "new" ? (
          <NewRestaurantView onProvisioned={() => setTab("restaurants")} />
        ) : (
          <AuditView />
        )}
      </div>
    </main>
  )
}

function useOpsAuthError(error: unknown) {
  const navigate = useNavigate()
  if (
    error &&
    typeof error === "object" &&
    "graphQLErrors" in error &&
    Array.isArray((error as { graphQLErrors: unknown[] }).graphQLErrors) &&
    (
      error as { graphQLErrors: { extensions?: { code?: string } }[] }
    ).graphQLErrors.some(
      (e) =>
        e.extensions?.code === "UNAUTHENTICATED" ||
        e.extensions?.code === "FORBIDDEN"
    )
  ) {
    clearOpsToken()
    navigate({ to: "/ops/login" })
  }
}

function RestaurantsView() {
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function onSearchChange(value: string) {
    setSearch(value)
    setOffset(0)
    window.clearTimeout((onSearchChange as { timer?: number }).timer)
    ;(onSearchChange as { timer?: number }).timer = window.setTimeout(
      () => setDebounced(value.trim() || null),
      300
    )
  }

  const { data, loading, error } = useQuery<
    {
      platformRestaurants: {
        items: Array<{
          id: string
          name: string
          slug: string
          code: string
          currency: string
        }>
        total: number
      }
    },
    { search: string | null; limit: number; offset: number }
  >(RESTAURANTS_QUERY, {
    variables: { search: debounced || null, limit: PAGE_SIZE, offset },
    context: opsAuthContext(),
  })
  useOpsAuthError(error)

  const items = data?.platformRestaurants?.items ?? []
  const total = data?.platformRestaurants?.total ?? 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-4">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or slug…"
          aria-label="Search restaurants"
        />
        {loading && (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-destructive">
            Couldn’t load restaurants.
          </p>
        )}
        <ul className="mt-4 divide-y divide-border">
          {items.map(
            (restaurant: {
              id: string
              name: string
              slug: string
              code: string
              currency: string
            }) => (
              <li key={restaurant.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(restaurant.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                    selectedId === restaurant.id ? "bg-muted" : ""
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {restaurant.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {restaurant.slug} · {restaurant.currency}
                    </span>
                  </span>
                  <code className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                    {restaurant.code}
                  </code>
                </button>
              </li>
            )
          )}
        </ul>
        {items.length === 0 && !loading && (
          <p className="mt-4 text-sm text-muted-foreground">
            No restaurants found.
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {offset + 1}–{offset + items.length} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              disabled={offset + items.length >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        {selectedId ? (
          <RestaurantDetail
            key={selectedId}
            restaurantId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a restaurant to see staff and recent activity.
          </p>
        )}
      </section>
    </div>
  )
}

function RestaurantDetail({
  restaurantId,
  onClose,
}: {
  restaurantId: string
  onClose: () => void
}) {
  const { data, loading, error, refetch } = useQuery<
    {
      platformRestaurant: {
        restaurant: {
          id: string
          name: string
          slug: string
          code: string
          currency: string
          timezone: string
          createdAt: string
        }
        staff: Array<{
          id: string
          name: string
          role: string
          active: boolean
        }>
        staffCount: number
        activeStaffCount: number
      }
      platformAuditLogs: {
        items: Array<{
          id: string
          action: string
          entityType: string
          createdAt: string
        }>
        total: number
      }
    },
    { id: string }
  >(RESTAURANT_DETAIL_QUERY, {
    variables: { id: restaurantId },
    context: opsAuthContext(),
  })
  useOpsAuthError(error)
  const [setStaffActive, { loading: toggling }] = useMutation(
    SET_STAFF_ACTIVE,
    {
      context: opsAuthContext(),
    }
  )

  async function toggleStaff(userId: string, active: boolean) {
    await setStaffActive({
      variables: { restaurantId, userId, active: !active },
    })
    refetch()
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error || !data?.platformRestaurant)
    return <p className="text-sm text-destructive">Couldn’t load details.</p>

  const detail = data.platformRestaurant
  const recentAudit = data.platformAuditLogs?.items ?? []

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{detail.restaurant.name}</h2>
          <p className="text-xs text-muted-foreground">
            {detail.restaurant.slug} · {detail.restaurant.currency} ·{" "}
            {detail.restaurant.timezone}
          </p>
          <RestaurantIdRow
            restaurantId={detail.restaurant.id}
            restaurantCode={detail.restaurant.code}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {detail.activeStaffCount}/{detail.staffCount} staff active · since{" "}
            {formatDate(detail.restaurant.createdAt)}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <h3 className="mt-5 text-sm font-medium">Staff</h3>
      <ul className="mt-2 divide-y divide-border">
        {detail.staff.map(
          (member: {
            id: string
            name: string
            role: string
            active: boolean
          }) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                {member.name}
                <Badge variant={member.active ? "default" : "secondary"}>
                  {member.role}
                </Badge>
                {!member.active && <Badge variant="outline">inactive</Badge>}
              </span>
              <Button
                variant="outline"
                disabled={toggling}
                onClick={() => toggleStaff(member.id, member.active)}
              >
                {member.active ? "Deactivate" : "Reactivate"}
              </Button>
            </li>
          )
        )}
      </ul>

      <h3 className="mt-5 text-sm font-medium">Recent activity</h3>
      {recentAudit.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No audit entries.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {recentAudit.map(
            (entry: {
              id: string
              action: string
              entityType: string
              createdAt: string
            }) => (
              <li key={entry.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {entry.action}
                </span>{" "}
                · {entry.entityType} · {formatDate(entry.createdAt)}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  )
}

function RestaurantIdRow({
  restaurantId,
  restaurantCode,
}: {
  restaurantId: string
  restaurantCode: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(restaurantCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-2 rounded-md border border-dashed bg-muted/40 px-2 py-1.5">
      <p className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold tracking-wide text-muted-foreground uppercase">
          Login code
        </span>
        <code className="font-mono text-sm font-bold tracking-widest text-foreground">
          {restaurantCode}
        </code>
        <Button variant="ghost" onClick={copy} className="h-6 px-2 text-xs">
          {copied ? "Copied" : "Copy"}
        </Button>
      </p>
      <p className="mt-1 font-mono text-[11px] break-all text-muted-foreground">
        ID {restaurantId}
      </p>
    </div>
  )
}

function AuditView() {
  const [restaurantId, setRestaurantId] = useState("")
  const [action, setAction] = useState("")
  const [offset, setOffset] = useState(0)

  const { data, loading, error } = useQuery<
    {
      platformAuditLogs: {
        items: Array<{
          id: string
          restaurantId: string
          actorId: string | null
          action: string
          entityType: string
          entityId: string | null
          createdAt: string
        }>
        total: number
      }
    },
    {
      restaurantId: string | null
      action: string | null
      limit: number
      offset: number
    }
  >(AUDIT_LOGS_QUERY, {
    variables: {
      restaurantId: restaurantId.trim() || null,
      action: action.trim() || null,
      limit: PAGE_SIZE,
      offset,
    },
    context: opsAuthContext(),
  })
  useOpsAuthError(error)

  const items = data?.platformAuditLogs?.items ?? []
  const total = data?.platformAuditLogs?.total ?? 0

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={restaurantId}
          onChange={(event) => {
            setRestaurantId(event.target.value)
            setOffset(0)
          }}
          placeholder="Filter by restaurant ID…"
          aria-label="Filter by restaurant ID"
        />
        <Input
          value={action}
          onChange={(event) => {
            setAction(event.target.value)
            setOffset(0)
          }}
          placeholder="Filter by action, e.g. staff.created…"
          aria-label="Filter by action"
        />
      </div>
      {loading && (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-destructive">
          Couldn’t load audit logs.
        </p>
      )}
      <ul className="mt-4 divide-y divide-border">
        {items.map(
          (entry: {
            id: string
            restaurantId: string
            actorId: string | null
            action: string
            entityType: string
            entityId: string | null
            createdAt: string
          }) => (
            <li key={entry.id} className="py-2.5 text-sm">
              <span className="font-medium">{entry.action}</span>{" "}
              <span className="text-muted-foreground">
                · {entry.entityType}
                {entry.entityId ? ` ${entry.entityId.slice(0, 8)}` : ""} ·
                restaurant {entry.restaurantId.slice(0, 8)} ·{" "}
                {formatDate(entry.createdAt)}
              </span>
            </li>
          )
        )}
      </ul>
      {items.length === 0 && !loading && (
        <p className="mt-4 text-sm text-muted-foreground">No entries found.</p>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0 ? 0 : offset + 1}–{offset + items.length} of {total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={offset + items.length >= total}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  )
}

function NewRestaurantView({ onProvisioned }: { onProvisioned: () => void }) {
  const [formKey, setFormKey] = useState(0)
  const [provisioned, setProvisioned] = useState<ProvisionedRestaurant | null>(
    null
  )

  if (provisioned) {
    return (
      <section className="rounded-xl border bg-card p-6 text-card-foreground sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircleIcon
            aria-hidden="true"
            className="size-7"
            weight="fill"
          />
        </span>
        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Restaurant provisioned
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
          {provisioned.restaurant.name} is ready
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-pretty text-muted-foreground">
          The workspace and owner account are active. Share the owner PIN with
          the restaurant — this provisioning was recorded in the audit log.
        </p>
        <dl className="mt-7 divide-y divide-border rounded-lg border bg-muted/20 px-4 text-sm">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">Workspace</dt>
            <dd className="font-medium">{provisioned.restaurant.slug}</dd>
          </div>{" "}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="font-medium">{provisioned.user.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">Operating region</dt>
            <dd className="font-medium">
              {provisioned.restaurant.currency} ·{" "}
              {provisioned.restaurant.timezone}
            </dd>
          </div>
        </dl>
        <div className="mt-6">
          <RestaurantIdRow
            restaurantId={provisioned.restaurant.id}
            restaurantCode={provisioned.restaurant.code}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setProvisioned(null)
              setFormKey((key) => key + 1)
            }}
          >
            Onboard another restaurant
          </Button>
          <Button variant="outline" onClick={onProvisioned}>
            View restaurants
          </Button>
        </div>
      </section>
    )
  }

  return (
    <RestaurantOnboarding
      key={formKey}
      mode="platform"
      onCompleted={setProvisioned}
    />
  )
}
