import { useState } from "react"
import type { ReactNode } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import {
  PauseIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  UserCheckIcon,
  UserMinusIcon,
} from "@phosphor-icons/react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { RestaurantEditModal } from "@/features/ops/ops-restaurant-edit"
import { PaystackSettings } from "@/features/payouts/paystack-settings"
import { OpsModal } from "@/features/ops/ops-overlays"
import { OpsHeader } from "@/features/ops/ops-shell"
import {
  PAGE_SIZE,
  RESTAURANTS_QUERY,
  RESTAURANT_DETAIL_QUERY,
  SET_RESTAURANT_SUSPENDED,
  SET_STAFF_ACTIVE,
  formatWhen,
} from "@/features/ops/ops-model"
import type {
  PlatformRestaurant,
  RestaurantCompliance,
  StaffMember,
} from "@/features/ops/ops-model"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { mutationMessage } from "@/features/menu/model"
import { opsAuthContext } from "@/lib/ops-token"
import { useTablePagination } from "@/lib/table-state"
import { useUrlState } from "@/lib/url-state"
import { OpsAudit } from "./ops-audit"

const dayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

export function OpsRestaurants() {
  const [searchParam, setSearchParam] = useUrlState("restaurantSearch")
  const paging = useTablePagination("restaurants", PAGE_SIZE)
  const navigate = useNavigate()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<PlatformRestaurant | null>(
    null
  )
  const [ownerTarget, setOwnerTarget] = useState<PlatformRestaurant | null>(
    null
  )
  const [actionError, setActionError] = useState<string | null>(null)

  function onSearchChange(value: string) {
    setSearchParam(value || null)
    paging.resetPage()
  }

  const { data, loading, error, refetch } = useQuery<
    {
      platformRestaurants: {
        items: PlatformRestaurant[]
        total: number
      }
    },
    { search: string | null; limit: number; offset: number }
  >(RESTAURANTS_QUERY, {
    variables: {
      search: searchParam?.trim() || null,
      limit: paging.pageSize,
      offset: paging.pageIndex * paging.pageSize,
    },
    context: opsAuthContext(),
  })
  useOpsAuthError(error)
  const [setSuspended, { loading: suspending }] = useMutation(
    SET_RESTAURANT_SUSPENDED,
    {
      context: opsAuthContext(),
    }
  )
  const [setStaffActive, { loading: togglingOwner }] = useMutation(
    SET_STAFF_ACTIVE,
    {
      context: opsAuthContext(),
    }
  )

  const items = data?.platformRestaurants.items ?? []
  const total = data?.platformRestaurants.total ?? 0

  async function confirmSuspension() {
    if (!suspendTarget) return
    try {
      setActionError(null)
      await setSuspended({
        variables: {
          id: suspendTarget.id,
          suspended: !suspendTarget.suspended,
        },
      })
      setSuspendTarget(null)
      await refetch()
    } catch (mutationError) {
      setActionError(
        mutationMessage(
          mutationError,
          suspendTarget.suspended
            ? "Could not reinstate this restaurant."
            : "Could not suspend this restaurant."
        )
      )
    }
  }

  async function confirmOwner() {
    if (!ownerTarget?.owner) return
    try {
      setActionError(null)
      await setStaffActive({
        variables: {
          restaurantId: ownerTarget.id,
          userId: ownerTarget.owner.id,
          active: !ownerTarget.owner.active,
        },
      })
      setOwnerTarget(null)
      await refetch()
    } catch (mutationError) {
      setActionError(
        mutationMessage(
          mutationError,
          ownerTarget.owner.active
            ? "Could not deactivate the owner."
            : "Could not reactivate the owner."
        )
      )
    }
  }

  return (
    <>
      <OpsHeader
        title="Restaurants"
        description="Workspaces provisioned on Ovaal. Open a row to edit details, suspend the restaurant, or review staff."
      >
        <Button nativeButton={false} render={<Link to="/ops/new" />}>
          <PlusIcon data-icon="inline-start" />
          Add restaurant
        </Button>
      </OpsHeader>

      <section className="content-region mx-4 mb-8 overflow-hidden rounded-md bg-card lg:mx-8 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <DataTable
          ariaLabel="Restaurants"
          rows={items}
          search={{
            value: searchParam ?? "",
            onChange: onSearchChange,
            placeholder: "Search by name or slug…",
            label: "Search restaurants",
          }}
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
              <th className="px-4 py-3 font-medium">Restaurant</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>
                  <LoadingState className="min-h-48" label="restaurants" />
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6}>
                  <ErrorState
                    title="Couldn’t load restaurants."
                    onRetry={refetch}
                  />
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No restaurants found."
                    description={
                      searchParam
                        ? "Try a different search or clear the current search."
                        : "Provision the first restaurant workspace to get started."
                    }
                    action={
                      searchParam ? (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => onSearchChange("")}
                        >
                          Clear search
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          nativeButton={false}
                          render={<Link to="/ops/new" />}
                        >
                          Add restaurant
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            )}
            {!error &&
              items.map((restaurant) => (
                <tr
                  key={restaurant.id}
                  className="cursor-pointer border-t border-border/70 hover:bg-muted/40"
                  onClick={() =>
                    void navigate({
                      to: "/ops/restaurants/$restaurantId",
                      params: { restaurantId: restaurant.id },
                      search: { tab: "general" },
                    })
                  }
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/ops/restaurants/$restaurantId"
                      params={{ restaurantId: restaurant.id }}
                      search={{ tab: "general" }}
                      className="block font-medium hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {restaurant.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {restaurant.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[restaurant.city, restaurant.region]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                      {restaurant.code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={restaurant.suspended ? "destructive" : "success"}
                    >
                      {restaurant.suspended ? "Suspended" : "Active"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatWhen(restaurant.createdAt)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${restaurant.name}`}
                        onClick={() => setEditingId(restaurant.id)}
                      >
                        <PencilSimpleIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          restaurant.suspended
                            ? `Reinstate ${restaurant.name}`
                            : `Suspend ${restaurant.name}`
                        }
                        onClick={() => {
                          setActionError(null)
                          setSuspendTarget(restaurant)
                        }}
                      >
                        {restaurant.suspended ? <PlayIcon /> : <PauseIcon />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          restaurant.owner?.active
                            ? `Deactivate ${restaurant.owner.name}`
                            : `Reactivate ${restaurant.owner?.name ?? "owner"}`
                        }
                        disabled={!restaurant.owner}
                        onClick={() => {
                          setActionError(null)
                          setOwnerTarget(restaurant)
                        }}
                      >
                        {restaurant.owner?.active === false ? (
                          <UserCheckIcon />
                        ) : (
                          <UserMinusIcon />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </DataTable>
      </section>

      <OpsModal
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null)
        }}
        title={
          suspendTarget?.suspended
            ? "Reinstate restaurant"
            : "Suspend restaurant"
        }
        description={
          suspendTarget?.suspended
            ? `${suspendTarget.name} can sign in and take orders again.`
            : `${suspendTarget?.name ?? "This restaurant"} will be blocked from the POS. Staff already signed in are signed out, and nobody can open a shift or take an order until you reinstate it.`
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={suspendTarget?.suspended ? "default" : "destructive"}
              disabled={suspending}
              onClick={() => void confirmSuspension()}
            >
              {suspending
                ? "Saving…"
                : suspendTarget?.suspended
                  ? "Reinstate"
                  : "Suspend"}
            </Button>
          </>
        }
      >
        {actionError && suspendTarget && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}
      </OpsModal>

      <OpsModal
        open={Boolean(ownerTarget)}
        onOpenChange={(open) => {
          if (!open) setOwnerTarget(null)
        }}
        title={
          ownerTarget?.owner?.active ? "Deactivate owner" : "Reactivate owner"
        }
        description={
          ownerTarget?.owner?.active
            ? `${ownerTarget.owner.name} won’t be able to sign in to ${ownerTarget.name} until you reactivate them.`
            : `${ownerTarget?.owner?.name ?? "This owner"} will be able to sign in to ${ownerTarget?.name ?? "the restaurant"} again.`
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOwnerTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={ownerTarget?.owner?.active ? "destructive" : "default"}
              disabled={togglingOwner}
              onClick={() => void confirmOwner()}
            >
              {togglingOwner
                ? "Saving…"
                : ownerTarget?.owner?.active
                  ? "Deactivate"
                  : "Reactivate"}
            </Button>
          </>
        }
      >
        {actionError && ownerTarget && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}
      </OpsModal>

      {editingId && (
        <RestaurantEditModal
          restaurantId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={async () => {
            setEditingId(null)
            await refetch()
          }}
        />
      )}
    </>
  )
}

export type RestaurantTab = "general" | "payments" | "compliance" | "audit"
export function RestaurantDetail({
  restaurantId,
  tab,
}: {
  restaurantId: string
  tab: RestaurantTab
}) {
  const [editing, setEditing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { data, loading, error, refetch } = useQuery<
    {
      platformRestaurant: {
        restaurant: PlatformRestaurant
        staff: StaffMember[]
        staffCount: number
        activeStaffCount: number
      }
    },
    { id: string }
  >(RESTAURANT_DETAIL_QUERY, {
    variables: { id: restaurantId },
    context: opsAuthContext(),
  })
  useOpsAuthError(error)
  const [pending, setPending] = useState<StaffMember | null>(null)
  const [setStaffActive, { loading: toggling }] = useMutation(
    SET_STAFF_ACTIVE,
    {
      context: opsAuthContext(),
    }
  )

  const detail = data?.platformRestaurant
  const restaurant = detail?.restaurant

  async function confirmToggle() {
    if (!pending || !restaurantId) return
    try {
      setActionError(null)
      await setStaffActive({
        variables: {
          restaurantId,
          userId: pending.id,
          active: !pending.active,
        },
      })
      setPending(null)
      await refetch()
    } catch (mutationError) {
      setActionError(
        mutationMessage(mutationError, "Could not update this staff member.")
      )
    }
  }

  return (
    <>
      <div className="px-4 pt-5 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/ops" />}
        >
          ← Restaurants
        </Button>
      </div>
      <OpsHeader
        title={restaurant?.name ?? "Restaurant"}
        description={
          restaurant
            ? `${restaurant.slug} · ${restaurant.currency} · ${restaurant.timezone}`
            : "Restaurant administration"
        }
      >
        {restaurant && (
          <>
            <StatusBadge
              tone={restaurant.suspended ? "destructive" : "success"}
            >
              {restaurant.suspended ? "Suspended" : "Active"}
            </StatusBadge>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilSimpleIcon data-icon="inline-start" />
              Edit details
            </Button>
          </>
        )}
      </OpsHeader>
      <div className="mx-4 mb-8 flex flex-1 flex-col lg:mx-8">
        <nav
          aria-label="Restaurant sections"
          className="mb-6 flex shrink-0 gap-6 overflow-x-auto border-b border-border/70"
        >
          {(
            [
              { value: "general", label: "General" },
              { value: "payments", label: "Payments" },
              { value: "compliance", label: "Compliance" },
              { value: "audit", label: "Audit logs" },
            ] as const
          ).map((item) => (
            <Link
              key={item.value}
              to="/ops/restaurants/$restaurantId"
              params={{ restaurantId }}
              search={{ tab: item.value }}
              aria-current={tab === item.value ? "page" : undefined}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring ${tab === item.value ? "border-secondary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {loading && <LoadingState label="restaurant" />}
        {error && (
          <ErrorState
            title="Couldn’t load this restaurant."
            onRetry={refetch}
          />
        )}
        {!error && restaurant && (
          <div className="content-region">
            {tab === "general" && (
              <div className="grid gap-6 rounded-xl border border-border/70 bg-card p-5 sm:p-6">
                <LoginCode code={restaurant.code} />
                <Section title="Location">
                  <p className="text-sm leading-6">
                    {[restaurant.address, restaurant.city, restaurant.region]
                      .filter(Boolean)
                      .join(", ") || "Location hasn’t been recorded."}
                  </p>
                  {restaurant.description && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {restaurant.description}
                    </p>
                  )}
                </Section>
                <Section title="Opening times">
                  {restaurant.openingHours?.length ? (
                    <ul className="space-y-1.5 text-sm">
                      {restaurant.openingHours.map((hours) => (
                        <li
                          key={hours.day}
                          className="flex justify-between gap-3"
                        >
                          <span>{dayLabels[hours.day] ?? hours.day}</span>
                          <span className="text-muted-foreground">
                            {hours.closed
                              ? "Closed"
                              : `${hours.opens} – ${hours.closes}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      title="Hours haven’t been added."
                      description="Add opening times in the restaurant details."
                    />
                  )}
                </Section>
                <Section
                  title={`Staff · ${detail.activeStaffCount}/${detail.staffCount} active`}
                >
                  <ul className="divide-y divide-border/70">
                    {detail.staff.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {member.name}
                          </span>
                          <span className="mt-1 flex items-center gap-1.5">
                            <Badge variant="secondary">{member.role}</Badge>
                            {!member.active && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </span>
                        </span>
                        {member.role !== "OWNER" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPending(member)}
                          >
                            {member.active ? "Deactivate" : "Reactivate"}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            )}
            {tab === "payments" && (
              <PaystackSettings
                key={restaurant.id}
                restaurantId={restaurant.id}
              />
            )}
            {tab === "compliance" && (
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
                <Section title="Compliance">
                  <ComplianceList compliance={restaurant.compliance} />
                </Section>
              </div>
            )}
            {tab === "audit" && (
              <OpsAudit restaurantId={restaurant.id} embedded />
            )}
          </div>
        )}
        {!loading && !error && !restaurant && (
          <EmptyState
            title="Restaurant not found"
            description="This restaurant is unavailable. Return to the restaurant directory."
          />
        )}
      </div>
      {editing && (
        <RestaurantEditModal
          restaurantId={restaurantId}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false)
            await refetch()
          }}
        />
      )}

      <OpsModal
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={pending?.active ? "Deactivate staff" : "Reactivate staff"}
        description={
          pending?.active
            ? `${pending.name} won’t be able to sign in until you reactivate them.`
            : `${pending?.name ?? "This person"} will be able to sign in again.`
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button disabled={toggling} onClick={() => void confirmToggle()}>
              {toggling
                ? "Saving…"
                : pending?.active
                  ? "Deactivate"
                  : "Reactivate"}
            </Button>
          </>
        }
      >
        {actionError && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}
      </OpsModal>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function LoginCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Login code</p>
        <code className="font-mono text-sm font-bold tracking-widest">
          {code}
        </code>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          })
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

function ComplianceList({
  compliance,
}: {
  compliance: RestaurantCompliance | null
}) {
  const rows = [
    ["Business registration", compliance?.businessRegistrationNumber],
    ["GRA TIN", compliance?.tin],
    ["Food hygiene permit", compliance?.foodHygienePermit],
    ["District assembly permit", compliance?.districtAssemblyPermit],
  ].filter((row): row is [string, string] => Boolean(row[1]))

  if (rows.length === 0 && !compliance?.notes) {
    return (
      <EmptyState
        title="No compliance records on file."
        description="Add compliance details in the restaurant settings."
      />
    )
  }

  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
      {compliance?.notes && (
        <p className="text-muted-foreground">{compliance.notes}</p>
      )}
    </dl>
  )
}
