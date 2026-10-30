import { useMemo } from "react"
import { useQuery } from "@apollo/client/react"
import { Navigate } from "@tanstack/react-router"
import { EyeIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable } from "@/components/ui/data-table"
import { EmptyState, ErrorState } from "@/components/content-state"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
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
import { useTablePagination } from "@/lib/table-state"

type RoleFilter = "ALL" | StaffRole
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"

export function StaffManagement() {
  const { t } = useLanguage()
  const profile = getAccessTokenProfile()
  const canManage = hasPermission(profile, "STAFF_MANAGE")
  const { data, loading, error, refetch } = useQuery<StaffData>(STAFF_QUERY, {
    skip: !canManage,
  })

  const [search, setSearch] = useUrlState("staffSearch")
  const [roleParam, setRoleParam] = useUrlState("staffRole")
  const [statusParam, setStatusParam] = useUrlState("staffStatus")
  const roleFilter = (roleParam ?? "ALL") as RoleFilter
  const statusFilter = (statusParam ?? "ALL") as StatusFilter
  const paging = useTablePagination("staff")

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
    const query = (search ?? "").trim().toLowerCase()
    return (data?.staff ?? []).filter((member) => {
      if (roleFilter !== "ALL" && member.role !== roleFilter) return false
      if (statusFilter === "ACTIVE" && !member.active) return false
      if (statusFilter === "INACTIVE" && member.active) return false
      if (query && !member.name.toLowerCase().includes(query)) return false
      return true
    })
  }, [data, search, roleFilter, statusFilter])

  const pageItems = filtered.slice(
    paging.windowStart(),
    (paging.pageIndex + 1) * paging.pageSize
  )

  function resetFilters() {
    setSearch(null)
    setRoleParam(null)
    setStatusParam(null)
    paging.resetPage()
  }

  if (!canManage) return <Navigate to="/overview" replace />

  return (
    <div className="content-page mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            {t("Staff")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "Add the people who use this till. Each person chooses a PIN the first time they sign in."
            )}
          </p>
        </header>
        <Button onClick={() => setNewStaffParam("1")}>
          <PlusIcon data-icon="inline-start" />
          {t("Add new staff")}
        </Button>
      </div>

      <section className="content-region mt-8 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {error ? (
          <ErrorState
            className="mt-6"
            title="Could not load staff."
            onRetry={refetch}
          />
        ) : !loading && staffList.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="No staff accounts yet."
            description="Add the first account to give your team access to the till."
            action={
              <Button
                size="lg"
                variant="default"
                onClick={() => setNewStaffParam("1")}
              >
                {t("Add new staff")}
              </Button>
            }
          />
        ) : (
          <>
            <div className="mt-6 overflow-hidden rounded-md bg-card lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <DataTable
                mobileFeedMode="window"
                ariaLabel="Staff"
                mobileFieldRoles={["identity", "meta", "status", "actions"]}
                rows={pageItems}
                search={{
                  value: search ?? "",
                  onChange: (value) => {
                    setSearch(value || null)
                    paging.resetPage()
                  },
                  placeholder: "Search staff by name",
                }}
                filters={
                  <>
                    <Select
                      value={roleFilter}
                      onValueChange={(value) => {
                        setRoleParam(value === "ALL" ? null : value)
                        paging.resetPage()
                      }}
                    >
                      <SelectTrigger
                        className="w-36"
                        aria-label={t("Filter by role")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("All roles")}</SelectItem>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {t(label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusParam(value === "ALL" ? null : value)
                        paging.resetPage()
                      }}
                    >
                      <SelectTrigger
                        className="w-36"
                        aria-label={t("Filter by status")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t("All statuses")}</SelectItem>
                        <SelectItem value="ACTIVE">{t("Active")}</SelectItem>
                        <SelectItem value="INACTIVE">
                          {t("Inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                }
                onRefresh={() => void refetch()}
                isLoading={loading}
                pagination={{ ...paging, totalCount: filtered.length }}
              >
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-xs tracking-[0.06em] text-muted-foreground uppercase">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t("Name")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t("Role")}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {t("Status")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-semibold"
                    >
                      {t("Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!loading && pageItems.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState
                          title="No staff match these filters."
                          description="Try a different search or clear the filters."
                          action={
                            <Button variant="outline" onClick={resetFilters}>
                              Clear filters
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  )}
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
                            <StatusBadge
                              tone={member.active ? "success" : "destructive"}
                            >
                              {member.active ? "Active" : "Inactive"}
                            </StatusBadge>
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
              </DataTable>
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
