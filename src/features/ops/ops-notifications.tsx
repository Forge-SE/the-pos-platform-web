import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { Popover } from "@base-ui/react/popover"
import { BellIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { opsAuthContext } from "@/lib/ops-token"

type Notice = {
  id: string
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
}

const NOTICES = gql`
  query PlatformNotifications {
    platformNotifications {
      id
      title
      body
      href
      readAt
      createdAt
    }
  }
`
const MARK_READ = gql`
  mutation MarkPlatformNotificationsRead {
    platformMarkNotificationsRead
  }
`

export function OpsNotifications() {
  const { data, error, refetch } = useQuery<{
    platformNotifications: Notice[]
  }>(NOTICES, {
    context: opsAuthContext(),
    fetchPolicy: "network-only",
    pollInterval: 20_000,
  })
  useOpsAuthError(error)
  const [markRead, { loading }] = useMutation(MARK_READ)
  const notices = data?.platformNotifications ?? []
  const unread = notices.filter((notice) => !notice.readAt).length

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            className="relative"
          />
        }
      >
        <BellIcon aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-card"
          />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={10}
          className="z-50 outline-none"
        >
          <Popover.Popup className="w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.1),0_12px_32px_oklch(0_0_0/0.16)] outline-none">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {unread ? `${unread} unread` : "You're all caught up"}
                </p>
              </div>
              {unread > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() =>
                    void markRead({ context: opsAuthContext() }).then(() =>
                      refetch()
                    )
                  }
                >
                  Mark read
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {error ? (
                <p role="alert" className="p-4 text-sm text-destructive">
                  Could not load notifications.
                </p>
              ) : notices.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Team invitations and platform updates will appear here.
                </p>
              ) : (
                notices.map((notice) => (
                  <a
                    key={notice.id}
                    href={notice.href ?? "/ops"}
                    className={`block border-b border-border/60 px-4 py-3 last:border-0 hover:bg-muted/50 ${notice.readAt ? "" : "bg-primary/10"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{notice.title}</p>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {new Date(notice.createdAt).toLocaleDateString("en-GH")}
                      </time>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {notice.body}
                    </p>
                  </a>
                ))
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
