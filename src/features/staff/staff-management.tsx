import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client/react"
import { Navigate } from "@tanstack/react-router"
import {
  CaretLeftIcon,
  CaretRightIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreateStaffDialog } from "@/features/staff/modals/create"
import { EditStaffDialog } from "@/features/staff/modals/edit"
import { ViewStaffDialog } from "@/features/staff/modals/view"
import { STAFF_QUERY, roleLabels } from "@/features/staff/model"
import type { StaffData, StaffRole } from "@/features/staff/model"
import { StaffAvatar } from "@/features/staff/staff-avatar"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"
import { useUrlState } from "@/lib/url-state"

const PAGE_SIZE = 8

type RoleFilter = "ALL" | StaffRole
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"

export function StaffManagement() {
  const profile = getAccessTokenProfile()
  const canManage = hasPermission(profile, "STAFF_MANAGE")
  const { data, loading, error, refetch } = useQuery<StaffData>(STAFF_QUERY, {
    skip: !canManage,
  })

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [page, setPage] = useState(1)

  const [newStaffParam, setNewStaffParam] = useUrlState("newStaff")
  const [viewStaffParam, setViewStaffParam] = useUrlState("viewStaff")
  const [editStaffParam, setEditStaffParam] = useUrlState("editStaff")
  const createOpen = newStaffParam === "1"
  const staffList = data?.staff ?? []
  const viewMember =
    staffList.find((member) => member.id === viewStaffParam) ?? null
  const editMember =
    staffList.find((member) => member.id === editStaffParam) ?? null

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (data?.staff ?? []).filter((member) => {
      if (roleFilter !== "ALL" && member.role !== roleFilter) return false
      if (statusFilter === "ACTIVE" && !member.active) return false
      if (statusFilter === "INACTIVE" && member.active) return false
      if (query && !member.name.toLowerCase().includes(query)) return false
      return true
    })
  }, [data, search, roleFilter, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  function resetFilters() {
    setSearch("")
    setRoleFilter("ALL")
    setStatusFilter("ALL")
    setPage(1)
  }

  if (!canManage) return <Navigate to="/overview" replace />

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Staff
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the people who use this till. Each person chooses a PIN the
            first time they sign in.
          </p>
        </header>
        <Button onClick={() => setNewStaffParam("1")}>
          <PlusIcon data-icon="inline-start" />
          Add new staff
        </Button>
      </div>

      <section className="mt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <InputGroup className="w-full lg:max-w-xs">
            <InputGroupAddon align="inline-start">
              <MagnifyingGlassIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search staff by name…"
              aria-label="Search staff by name"
            />
          </InputGroup>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value ?? "ALL")
                setPage(1)
              }}
            >
              <SelectTrigger
                className="w-full sm:w-36"
                aria-label="Filter by role"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value ?? "ALL")
                setPage(1)
              }}
            >
              <SelectTrigger
                className="w-full sm:w-36"
                aria-label="Filter by status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg bg-destructive/5 p-5 text-sm text-destructive">
            Could not load staff. Try refreshing this page.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto rounded-xl border border-border/70 bg-card">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-xs tracking-[0.06em] text-muted-foreground uppercase">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-4 py-4">
                            <div className="h-4 w-32 rounded bg-muted" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-20 rounded bg-muted" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-16 rounded bg-muted" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="ml-auto h-4 w-16 rounded bg-muted" />
                          </td>
                        </tr>
                      ))
                    : pageItems.map((member) => (
                        <tr
                          key={member.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3.5 font-medium">
                            <div className="flex items-center gap-3">
                              <StaffAvatar
                                name={member.name}
                                url={member.avatarUrl}
                                className="size-9 text-xs"
                              />
                              <span>
                                {member.name}
                                {member.pinSet === false && (
                                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                    PIN not chosen yet
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline">
                              {roleLabels[member.role]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            {member.active ? (
                              <Badge
                                variant="outline"
                                className="border-transparent bg-primary/25 text-primary-foreground"
                              >
                                <span
                                  aria-hidden="true"
                                  className="size-1.5 rounded-full bg-secondary"
                                />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View ${member.name}`}
                                title={`View ${member.name}`}
                                onClick={() => setViewStaffParam(member.id)}
                              >
                                <EyeIcon />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${member.name}`}
                                title={`Edit ${member.name}`}
                                onClick={() => setEditStaffParam(member.id)}
                              >
                                <PencilSimpleIcon />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
              {!loading && filtered.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-medium">
                    {(data?.staff.length ?? 0) === 0
                      ? "No staff accounts yet."
                      : "No staff match these filters."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(data?.staff.length ?? 0) === 0
                      ? "Use “Add new staff” to create the first account."
                      : "Try a different search or clear the filters."}
                  </p>
                  {(data?.staff.length ?? 0) > 0 && (
                    <Button
                      className="mt-4"
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              <p className="mr-auto text-xs text-muted-foreground">
                Showing{" "}
                {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} staff
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <CaretLeftIcon />
                </Button>
                {Array.from({ length: pageCount }).map((_, index) => {
                  const pageNumber = index + 1
                  const isCurrent = pageNumber === safePage
                  return (
                    <Button
                      key={pageNumber}
                      variant={isCurrent ? "default" : "ghost"}
                      size="icon-xs"
                      className={
                        isCurrent
                          ? "bg-primary text-xs text-primary-foreground hover:bg-primary/80"
                          : "text-xs"
                      }
                      aria-label={`Go to page ${pageNumber}`}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  )
                })}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Next page"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  <CaretRightIcon />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      <CreateStaffDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setNewStaffParam(null)
        }}
        onCreated={() => {
          setNewStaffParam(null)
          void refetch()
        }}
      />
      <ViewStaffDialog
        member={viewMember}
        open={viewMember !== null}
        onOpenChange={(open) => {
          if (!open) setViewStaffParam(null)
        }}
      />
      <EditStaffDialog
        member={editMember}
        open={editMember !== null}
        onOpenChange={(open) => {
          if (!open) setEditStaffParam(null)
        }}
        onUpdated={() => {
          void refetch()
        }}
      />
    </div>
  )
}
