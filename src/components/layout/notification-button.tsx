import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery, useSubscription } from "@apollo/client/react"
import { Popover } from "@base-ui/react/popover"
import { BellIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

type Notice = {
  id: string
  kind: string
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
}

const NOTIFICATIONS_QUERY = gql`
  query RestaurantNotifications {
    notifications {
      id
      kind
      title
      body
      href
      readAt
      createdAt
    }
  }
`

const MARK_READ = gql`
  mutation MarkNotificationsRead {
    markNotificationsRead
  }
`

const RAISED = gql`
  subscription NotificationRaised {
    notificationRaised {
      id
      kind
      title
      body
      href
      readAt
      createdAt
    }
  }
`

function when(value: string, locale: string) {
  const then = new Date(value).getTime()
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60_000))
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (minutes < 60) return relative.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (hours < 24) return relative.format(-hours, "hour")
  const days = Math.round(hours / 24)
  return relative.format(-days, "day")
}

export function NotificationButton() {
  const { t, locale } = useLanguage()
  const [tab, setTab] = useState<"all" | "inbox" | "archived">("all")
  const { data, refetch } = useQuery<{ notifications: Notice[] }>(
    NOTIFICATIONS_QUERY,
    { pollInterval: 20_000 }
  )
  const { data: raised } = useSubscription<{ notificationRaised: Notice }>(
    RAISED
  )
  const [markRead] = useMutation(MARK_READ)
  const notices = data?.notifications ?? []

  useEffect(() => {
    if (raised?.notificationRaised) void refetch()
  }, [raised, refetch])

  const visible = notices.filter((notice) => {
    if (tab === "inbox") return !notice.readAt
    if (tab === "archived") return Boolean(notice.readAt)
    return true
  })
  const unread = notices.filter((notice) => !notice.readAt).length

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Notifications")}
            className="relative text-muted-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
          />
        }
      >
        <BellIcon aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-card" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={12}
          className="z-50 outline-none"
        >
          <Popover.Popup className="mobile-notification-panel w-[min(28rem,calc(100vw-2.25rem))] origin-[var(--transform-origin)] overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.08),0_12px_32px_oklch(0.18_0.03_150/0.14)] outline-none">
            <div className="flex h-14 items-center justify-between px-5">
              <span className="text-sm font-semibold">
                {t("Notifications")}
              </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-secondary"
                onClick={() => {
                  void markRead().then(() => refetch())
                }}
              >
                {t("Mark all as read")}
              </Button>
            </div>
            <div className="flex gap-2 px-5 pb-3">
              {(
                [
                  ["all", "All"],
                  ["inbox", "Inbox"],
                  ["archived", "Archived"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${tab === value ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {t(label)}
                </button>
              ))}
            </div>
            <div className="max-h-96 overflow-y-auto border-t border-border/70">
              {visible.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">
                  {t(
                    "Nothing in this tab. Low stock, large voids, cash variance, payment failures, and offline conflicts show up here."
                  )}
                </p>
              ) : (
                visible.map((notice) => (
                  <a
                    key={notice.id}
                    href={notice.href ?? "/overview"}
                    className="block border-b border-border/60 px-5 py-3 last:border-0 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{notice.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {when(notice.createdAt, locale)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
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
