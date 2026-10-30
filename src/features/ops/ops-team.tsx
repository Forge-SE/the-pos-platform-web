import { useState } from "react"
import type { FormEvent } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { CopyIcon, EnvelopeSimpleIcon, PlusIcon } from "@phosphor-icons/react"

import { ErrorState } from "@/components/content-state"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import type { DataTableColumn } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { OpsModal } from "@/features/ops/ops-overlays"
import { OpsHeader } from "@/features/ops/ops-shell"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { opsAuthContext } from "@/lib/ops-token"
import { useTablePagination } from "@/lib/table-state"
import { useUrlState } from "@/lib/url-state"

type Member = {
  id: string
  email: string
  name: string | null
  role: "ADMIN" | "MEMBER"
  status: "ACTIVE" | "INVITED" | "EXPIRED" | "DISABLED"
  lastLoginAt: string | null
}

const TEAM_QUERY = gql`
  query PlatformTeamPage {
    platformMe {
      id
      name
      email
      role
    }
    platformTeam {
      id
      name
      email
      role
      status
      lastLoginAt
    }
  }
`
const INVITE = gql`
  mutation InvitePlatformMember($email: String!, $role: PlatformTeamRole!) {
    platformInviteMember(email: $email, role: $role) {
      member {
        id
      }
      inviteUrl
    }
  }
`
const RESEND = gql`
  mutation ResendPlatformInvite($id: ID!) {
    platformResendInvite(id: $id) {
      inviteUrl
    }
  }
`
const SET_ACTIVE = gql`
  mutation SetPlatformMemberActive($id: ID!, $active: Boolean!) {
    platformSetMemberActive(id: $id, active: $active) {
      id
      status
    }
  }
`

function date(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-GH", { dateStyle: "medium" })
    : "—"
}

export function OpsTeam() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER")
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useUrlState("teamSearch")
  const paging = useTablePagination("team", 20, [10, 20, 50])
  const { data, loading, error, refetch } = useQuery<{
    platformMe: { id: string; role: "ADMIN" | "MEMBER" }
    platformTeam: Member[]
  }>(TEAM_QUERY, { context: opsAuthContext(), fetchPolicy: "network-only" })
  useOpsAuthError(error)
  const [invite, { loading: inviting }] = useMutation<{
    platformInviteMember: { inviteUrl: string | null }
  }>(INVITE)
  const [resend] = useMutation<{
    platformResendInvite: { inviteUrl: string | null }
  }>(RESEND)
  const [setActive] = useMutation(SET_ACTIVE)
  const admin = data?.platformMe.role === "ADMIN"

  async function sendInvite(event: FormEvent) {
    event.preventDefault()
    setActionError(null)
    setNotice(null)
    setInviteUrl(null)
    try {
      const result = await invite({
        variables: { email: email.trim(), role },
        context: opsAuthContext(),
      })
      setInviteUrl(result.data?.platformInviteMember.inviteUrl ?? null)
      setNotice(`Invitation created for ${email.trim()}.`)
      setEmail("")
      setInviteOpen(false)
      await refetch()
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be sent."
      )
    }
  }

  const filtered = (data?.platformTeam ?? []).filter((member) => {
    const term = (search ?? "").trim().toLowerCase()
    return (
      !term ||
      [member.name, member.email, member.role, member.status]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    )
  })
  const pageIndex = Math.min(
    paging.pageIndex,
    Math.max(0, Math.ceil(filtered.length / paging.pageSize) - 1)
  )
  const rows = filtered.slice(
    paging.windowStart(pageIndex),
    (pageIndex + 1) * paging.pageSize
  )
  const columns: DataTableColumn<Member>[] = [
    {
      id: "member",
      header: "Member",
      cell: (member) => (
        <div className="min-w-44">
          <span className="block font-medium">
            {member.name || member.email}
          </span>
          {member.name && (
            <span className="text-xs text-muted-foreground">
              {member.email}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (member) => (
        <span className="capitalize">{member.role.toLowerCase()}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (member) => (
        <StatusBadge
          tone={
            member.status === "ACTIVE"
              ? "success"
              : member.status === "EXPIRED"
                ? "warning"
                : "neutral"
          }
        >
          {member.status.toLowerCase()}
        </StatusBadge>
      ),
    },
    {
      id: "lastLogin",
      header: "Last sign-in",
      cell: (member) => (
        <span className="text-muted-foreground">
          {date(member.lastLoginAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (member) =>
        admin && member.id !== data.platformMe.id ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busyId === member.id}
            onClick={() => void memberAction(member)}
          >
            {member.status === "INVITED" || member.status === "EXPIRED" ? (
              <>
                <EnvelopeSimpleIcon data-icon="inline-start" />
                Resend invite
              </>
            ) : member.status === "DISABLED" ? (
              "Restore"
            ) : (
              "Remove access"
            )}
          </Button>
        ) : null,
    },
  ]

  async function memberAction(member: Member) {
    setActionError(null)
    setNotice(null)
    setInviteUrl(null)
    setBusyId(member.id)
    try {
      if (member.status === "INVITED" || member.status === "EXPIRED") {
        const result = await resend({
          variables: { id: member.id },
          context: opsAuthContext(),
        })
        setInviteUrl(result.data?.platformResendInvite.inviteUrl ?? null)
        setNotice(`A new invitation was created for ${member.email}.`)
      } else {
        const active = member.status === "DISABLED"
        await setActive({
          variables: { id: member.id, active },
          context: opsAuthContext(),
        })
        setNotice(
          `${member.email} ${active ? "can now" : "can no longer"} sign in.`
        )
      }
      await refetch()
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "Could not update this member."
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <OpsHeader
        title="Team"
        description="Invite operations teammates and manage access to the platform."
      >
        {admin && (
          <Button
            type="button"
            onClick={() => {
              setActionError(null)
              setInviteOpen(true)
            }}
          >
            <PlusIcon data-icon="inline-start" />
            Invite member
          </Button>
        )}
      </OpsHeader>
      <section className="flex min-h-[calc(100svh-11rem)] min-w-0 flex-1 flex-col gap-4 px-5 pb-6 lg:px-8">
        {actionError && !inviteOpen && (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-secondary">
            {notice}
          </p>
        )}
        {inviteUrl && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
            <span className="font-medium">Development invite link</span>
            <Input
              readOnly
              value={inviteUrl}
              aria-label="Invitation link"
              className="min-w-48 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(inviteUrl)}
            >
              <CopyIcon data-icon="inline-start" />
              Copy
            </Button>
          </div>
        )}

        <DataTable
          mobileFeedMode="window"
          ariaLabel="Operations team"
          rows={rows}
          columns={columns}
          getRowId={(member) => member.id}
          search={{
            value: search ?? "",
            onChange: (value) => {
              setSearch(value || null)
              paging.resetPage()
            },
            placeholder: "Search members",
          }}
          onRefresh={() => void refetch()}
          pagination={{
            pageIndex,
            pageSize: paging.pageSize,
            totalCount: filtered.length,
            onLoadMore: paging.onLoadMore,
            onPageChange: paging.onPageChange,
            onPageSizeChange: paging.onPageSizeChange,
            pageSizeOptions: [10, 20, 50],
          }}
          isLoading={loading && !data}
          errorState={
            error ? (
              <ErrorState
                title="Could not load the operations team."
                onRetry={() => void refetch()}
              />
            ) : undefined
          }
          emptyState={
            search ? "No members match your search." : "No team members yet."
          }
        />
      </section>
      <OpsModal
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) setActionError(null)
        }}
        title="Invite team member"
        description="Invite someone to your operations workspace. Invitations expire after seven days."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="ops-invite-form" disabled={inviting}>
              {inviting ? "Sending…" : "Send invitation"}
            </Button>
          </>
        }
      >
        <form
          id="ops-invite-form"
          onSubmit={(event) => void sendInvite(event)}
          className="mt-5 space-y-4"
        >
          <label className="block space-y-1.5 text-sm font-medium">
            Email address
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              required
              autoFocus
            />
          </label>
          <div className="space-y-1.5 text-sm font-medium">
            <label htmlFor="ops-invite-role">Role</label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as "ADMIN" | "MEMBER")}
            >
              <SelectTrigger id="ops-invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Admins can manage team access. Members can use the operations
            workspace.
          </p>
          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}
        </form>
      </OpsModal>
    </div>
  )
}
