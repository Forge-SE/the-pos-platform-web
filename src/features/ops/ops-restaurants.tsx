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
import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RestaurantEditModal } from "@/features/ops/ops-restaurant-edit"
import { OpsDrawer, OpsModal } from "@/features/ops/ops-overlays"
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
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<PlatformRestaurant | null>(
    null
  )
  const [ownerTarget, setOwnerTarget] = useState<PlatformRestaurant | null>(
    null
  )
  const [actionError, setActionError] = useState<string | null>(null)

  function onSearchChange(value: string) {
    setSearch(value)
    setOffset(0)
    window.clearTimeout((onSearchChange as { timer?: number }).timer)
    ;(onSearchChange as { timer?: number }).timer = window.setTimeout(
      () => setDebounced(value.trim() || null),
      300
    )
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
    variables: { search: debounced || null, limit: PAGE_SIZE, offset },
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
        <Button render={<Link to="/ops/new" />}>
          <PlusIcon data-icon="inline-start" />
          Add restaurant
        </Button>
      </OpsHeader>

      <section className="mx-4 mb-8 overflow-hidden rounded-xl border border-border/70 bg-card lg:mx-8">
        <div className="border-b border-border/70 px-4 py-3">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name or slug"
            aria-label="Search restaurants"
            className="max-w-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
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
                  <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                    Loading restaurants…
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-destructive">
                    Couldn’t load restaurants.
                  </td>
                </tr>
              )}
              {!loading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                    No restaurants found.
                  </td>
                </tr>
              )}
              {items.map((restaurant) => (
                <tr
                  key={restaurant.id}
                  className="cursor-pointer border-t border-border/70 hover:bg-muted/40"
                  onClick={() => setSelectedId(restaurant.id)}
                >
                  <td className="px-4 py-3">
                    <span className="block font-medium">{restaurant.name}</span>
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
                    <Badge
                      variant={
                        restaurant.suspended ? "destructive" : "secondary"
                      }
                    >
                      {restaurant.suspended ? "Suspended" : "Active"}
                    </Badge>
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

      <RestaurantDrawer
        restaurantId={selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onChanged={() => void refetch()}
      />

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

function RestaurantDrawer({
  restaurantId,
  onOpenChange,
  onChanged,
}: {
  restaurantId: string | null
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const { data, loading, error, refetch } = useQuery<
    {
      platformRestaurant: {
        restaurant: PlatformRestaurant
        staff: StaffMember[]
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
      }
    },
    { id: string }
  >(RESTAURANT_DETAIL_QUERY, {
    variables: { id: restaurantId ?? "" },
    skip: !restaurantId,
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
  const auditEntries = data?.platformAuditLogs.items ?? []

  async function confirmToggle() {
    if (!pending || !restaurantId) return
    await setStaffActive({
      variables: {
        restaurantId,
        userId: pending.id,
        active: !pending.active,
      },
    })
    setPending(null)
    await refetch()
    onChanged()
  }

  return (
    <>
      <OpsDrawer
        open={Boolean(restaurantId)}
        onOpenChange={onOpenChange}
        title={restaurant?.name ?? "Restaurant"}
        description={
          restaurant
            ? `${restaurant.slug} · ${restaurant.currency} · ${restaurant.timezone}`
            : undefined
        }
      >
        {loading && (
          <p className="text-sm text-muted-foreground">Loading restaurant…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">
            Couldn’t load this restaurant.
          </p>
        )}
        {restaurant && (
          <div className="space-y-6">
            <Badge variant={restaurant.suspended ? "destructive" : "secondary"}>
              {restaurant.suspended ? "Suspended" : "Active"}
            </Badge>
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
                    <li key={hours.day} className="flex justify-between gap-3">
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
                <p className="text-sm text-muted-foreground">
                  Hours haven’t been added.
                </p>
              )}
            </Section>
            <Section title="Compliance">
              <ComplianceList compliance={restaurant.compliance} />
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
            <Section title="Recent activity">
              {auditEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No audit entries.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {auditEntries.map((entry) => (
                    <li key={entry.id}>
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {entry.entityType} · {formatWhen(entry.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </OpsDrawer>

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
      />
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
      <p className="text-sm text-muted-foreground">
        No compliance records on file.
      </p>
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
