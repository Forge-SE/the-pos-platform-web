import type { ReactNode } from "react"
import {
  ChartLineUpIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  SignOutIcon,
  StorefrontIcon,
} from "@phosphor-icons/react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"

import { OvaalMark } from "@/components/ovaal-mark"
import { Button } from "@/components/ui/button"
import { clearOpsToken } from "@/lib/ops-token"

const links = [
  {
    label: "Restaurants",
    to: "/ops",
    icon: StorefrontIcon,
    exact: true,
    section: "directory",
  },
  {
    label: "Metrics",
    to: "/ops/metrics",
    icon: ChartLineUpIcon,
    exact: true,
    section: "insights",
  },
  {
    label: "Subscriptions",
    to: "/ops/subscriptions",
    icon: CreditCardIcon,
    exact: true,
    section: "insights",
  },
  {
    label: "Audit log",
    to: "/ops/audit",
    icon: ClipboardTextIcon,
    exact: false,
    section: "records",
  },
] as const

export function OpsHeader({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="flex min-h-[88px] flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between lg:px-8">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-[-0.025em] lg:text-xl">
          {title}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children ? (
        <div className="flex items-center gap-3">{children}</div>
      ) : null}
    </header>
  )
}

export function OpsShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  function signOut() {
    clearOpsToken()
    navigate({ to: "/ops/login" })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background lg:grid lg:h-dvh lg:grid-cols-[240px_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="hidden min-h-0 overflow-hidden border-r border-border/70 bg-sidebar lg:flex lg:flex-col">
        <div className="flex shrink-0 items-center gap-2 px-4 py-5">
          <OvaalMark />
        </div>
        <nav
          className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-6 overflow-y-auto px-3 pb-3 [&::-webkit-scrollbar]:hidden [&>div]:shrink-0"
          aria-label="Platform"
        >
          <NavGroup label="Directory" pathname={pathname} section="directory" />
          <NavGroup label="Insights" pathname={pathname} section="insights" />
          <NavGroup label="Records" pathname={pathname} section="records" />
        </nav>
        <div className="shrink-0 border-t border-border/70 p-3">
          <p className="px-3 text-xs font-medium text-muted-foreground">
            Platform admin
          </p>
          <Button
            variant="ghost"
            className="mt-1 w-full justify-start"
            onClick={signOut}
          >
            <SignOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 lg:hidden">
          <OvaalMark />
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <NavLink key={link.to} link={link} pathname={pathname} compact />
            ))}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={signOut}
            >
              <SignOutIcon />
            </Button>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}

function NavGroup({
  label,
  pathname,
  section,
}: {
  label: string
  pathname: string
  section: (typeof links)[number]["section"]
}) {
  const items = links.filter((link) => link.section === section)
  return (
    <div className="space-y-1">
      <p className="px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      {items.map((link) => (
        <NavLink key={link.to} link={link} pathname={pathname} />
      ))}
    </div>
  )
}

function NavLink({
  link,
  pathname,
  compact = false,
}: {
  link: (typeof links)[number]
  pathname: string
  compact?: boolean
}) {
  const active = link.exact
    ? pathname === link.to
    : pathname.startsWith(link.to)
  const Icon = link.icon
  return (
    <Link
      to={link.to}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg text-sm transition-colors hover:bg-muted ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      } ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
    >
      <Icon className="size-4 shrink-0" />
      {compact ? null : link.label}
    </Link>
  )
}
