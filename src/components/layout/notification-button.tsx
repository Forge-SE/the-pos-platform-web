import { useState } from "react"
import { Popover } from "@base-ui/react/popover"
import {
  ArrowRightIcon,
  BellIcon,
  FunnelIcon,
  GearIcon,
  PaperclipIcon,
} from "@phosphor-icons/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type NoticeTab = "inbox" | "following" | "archived"

type Notice = {
  id: string
  tab: NoticeTab
  initials: string
  tone: string
  title: string
  time: string
  source: string
  busy?: boolean
  kind?: "decision" | "file" | "note"
}

const notices: Notice[] = [
  {
    id: "shift-join",
    tab: "inbox",
    initials: "AK",
    tone: "bg-secondary text-secondary-foreground",
    title: "Ama Kwesi opened the register",
    time: "8 min ago",
    source: "Front counter",
    busy: true,
  },
  {
    id: "void-request",
    tab: "inbox",
    initials: "KM",
    tone: "bg-primary text-primary-foreground",
    title: "Kojo Mensah asked to void ticket 1842",
    time: "2 hours ago",
    source: "Counter",
    busy: true,
    kind: "decision",
  },
  {
    id: "eod-file",
    tab: "following",
    initials: "SA",
    tone: "bg-muted text-foreground",
    title: "Selorm Adjei uploaded the end-of-day sheet",
    time: "3 hours ago",
    source: "Shift close",
    kind: "file",
  },
  {
    id: "kitchen-note",
    tab: "archived",
    initials: "ET",
    tone: "bg-muted text-foreground",
    title: "Esi Tetteh left a note on the jollof order",
    time: "2 days ago",
    source: "Kitchen",
    kind: "note",
  },
]

const tabs: { value: "all" | NoticeTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "inbox", label: "Inbox" },
  { value: "following", label: "Following" },
  { value: "archived", label: "Archived" },
]

export function NotificationButton() {
  const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("all")
  const [read, setRead] = useState(false)
  const visible = notices.filter(
    (notice) => tab === "all" || notice.tab === tab
  )
  const inboxCount = notices.filter((notice) => notice.tab === "inbox").length

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative text-muted-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
          />
        }
      >
        <BellIcon aria-hidden="true" />
        {!read && (
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
          <Popover.Popup className="w-[min(28rem,calc(100vw-2.25rem))] origin-[var(--transform-origin)] overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.08),0_12px_32px_oklch(0.18_0.03_150/0.14)] transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none dark:shadow-[0_0_0_1px_oklch(1_0_0/0.1)]">
            <div className="flex h-14 items-center justify-between px-5">
              <span className="text-sm font-semibold">Notifications</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-secondary"
                onClick={() => setRead(true)}
              >
                Mark all as read
              </Button>
            </div>
            <div className="flex items-center justify-between gap-5 border-y border-border px-5">
              <div
                role="tablist"
                aria-label="Notification filters"
                className="flex min-w-0 gap-5 overflow-x-auto"
              >
                {tabs.map((item, index) => (
                  <span key={item.value} className="flex items-center gap-5">
                    {index === 3 && (
                      <span
                        className="h-5 w-px shrink-0 bg-border"
                        role="separator"
                      />
                    )}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === item.value}
                      className={`flex h-12 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium ${
                        tab === item.value
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground"
                      }`}
                      onClick={() => setTab(item.value)}
                    >
                      {item.label}
                      {item.value === "inbox" && !read && (
                        <Badge className="h-5 min-w-5 justify-center rounded-full bg-destructive px-1.5 text-white">
                          {inboxCount}
                        </Badge>
                      )}
                    </button>
                  </span>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Filter notifications"
                className="shrink-0 rounded-full text-muted-foreground"
              >
                <FunnelIcon aria-hidden="true" weight="fill" />
              </Button>
            </div>

            <div className="flex max-h-[24rem] flex-col gap-1 overflow-y-auto p-2">
              {visible.map((notice, index) => (
                <div key={notice.id}>
                  {index > 0 && <div className="mx-3 h-px bg-border" />}
                  <article className="flex items-start gap-3.5 rounded-lg p-3 text-sm">
                    <span className="relative">
                      <Avatar className={notice.tone}>
                        <AvatarFallback className="bg-transparent text-xs font-semibold text-inherit">
                          {notice.initials}
                        </AvatarFallback>
                      </Avatar>
                      {notice.busy && (
                        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-popover" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm leading-5 text-muted-foreground">
                          <strong className="font-medium text-foreground">
                            {notice.title}
                          </strong>
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{notice.time}</span>
                          <span aria-hidden="true">·</span>
                          <span>{notice.source}</span>
                        </p>
                      </div>
                      {notice.kind === "decision" && (
                        <div className="flex gap-2.5">
                          <Button variant="outline" size="xs">
                            Deny
                          </Button>
                          <Button size="xs">Approve</Button>
                        </div>
                      )}
                      {notice.kind === "file" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-normal"
                        >
                          <PaperclipIcon
                            aria-hidden="true"
                            data-icon="inline-start"
                          />
                          end-of-day.csv
                          <span className="text-muted-foreground">(4mb)</span>
                        </Button>
                      )}
                      {notice.kind === "note" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-normal"
                        >
                          Extra pepper on the side
                        </Button>
                      )}
                    </div>
                  </article>
                </div>
              ))}
            </div>

            <div className="flex h-12 items-center justify-between border-t border-border px-5">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                Use
                <span className="flex size-5 items-center justify-center rounded bg-muted ring-1 ring-border">
                  <ArrowRightIcon aria-hidden="true" className="size-3.5" />
                </span>
                to navigate
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-muted-foreground"
              >
                <GearIcon aria-hidden="true" data-icon="inline-start" />
                Manage notifications
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
