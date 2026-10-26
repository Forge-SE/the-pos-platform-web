import { useState, type ReactNode } from "react"
import { gql } from "@apollo/client"
import { useApolloClient, useQuery } from "@apollo/client/react"
import {
  CaretDownIcon,
  HeartbeatIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  StorefrontIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"

import { OvaalMark } from "@/components/ovaal-mark"
import { OpsAccountMenu } from "@/features/ops/ops-account-menu"
import { OpsNotifications } from "@/features/ops/ops-notifications"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import { clearOpsToken, opsAuthContext } from "@/lib/ops-token"

const ME_QUERY = gql`
  query PlatformShellMe {
    platformMe {
      id
      name
      email
      role
    }
  }
`

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
    label: "Pilot health",
    to: "/ops/health",
    icon: HeartbeatIcon,
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
  {
    label: "Team",
    to: "/ops/team",
    icon: UsersThreeIcon,
    exact: true,
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
    <header className="flex min-h-[104px] w-full min-w-0 flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.035em] lg:text-3xl">
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
  const client = useApolloClient()
  const { data: meData, error: meError } = useQuery<{
    platformMe: { id: string; name: string | null; email: string; role: string }
  }>(ME_QUERY, { context: opsAuthContext(), fetchPolicy: "network-only" })
  useOpsAuthError(meError)
  const me = meData?.platformMe
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const currentPage =
    links.find((link) => link.to !== "/ops" && pathname.startsWith(link.to))
      ?.label ?? "Restaurants"

  async function signOut() {
    clearOpsToken()
    await client.clearStore()
    navigate({ to: "/ops/login", replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-card lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen min-h-0 overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <OvaalMark />
          <span className="border-l border-sidebar-border pl-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Platform
          </span>
        </div>
        <nav
          className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-3 overflow-y-auto px-3 py-5 [&::-webkit-scrollbar]:hidden [&>div]:shrink-0"
          aria-label="Platform"
        >
          <NavGroup label="Directory" pathname={pathname} section="directory" />
          <NavGroup label="Insights" pathname={pathname} section="insights" />
          <NavGroup label="Records" pathname={pathname} section="records" />
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <OpsAccountMenu
            name={me?.name || "Operations"}
            email={me?.email || ""}
            role={me?.role || "MEMBER"}
            onSignOut={() => void signOut()}
          />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-card">
        <div className="hidden h-16 shrink-0 items-center gap-3 border-b border-border/70 px-8 text-sm lg:flex">
          <span className="text-muted-foreground">Platform</span>
          <span aria-hidden="true" className="text-muted-foreground/50">
            /
          </span>
          <span className="font-medium">{currentPage}</span>
          <div className="ml-auto">
            <OpsNotifications />
          </div>
        </div>
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 px-4 py-3 lg:hidden">
          <OvaalMark />
          <div className="flex items-center gap-1 overflow-x-auto">
            {links.map((link) => (
              <NavLink key={link.to} link={link} pathname={pathname} compact />
            ))}
            <OpsNotifications />
            <OpsAccountMenu
              name={me?.name || "Operations"}
              email={me?.email || ""}
              role={me?.role || "MEMBER"}
              onSignOut={() => void signOut()}
              compact
            />
          </div>
        </div>
        <div className="content-page flex w-full min-w-0 flex-1 flex-col">
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
  const [open, setOpen] = useState(true)
  const items = links.filter((link) => link.section === section)
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-9 w-full items-center justify-between rounded-md px-3 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <CaretDownIcon
          aria-hidden="true"
          className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {items.map((link) => (
            <NavLink key={link.to} link={link} pathname={pathname} />
          ))}
        </div>
      )}
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
  const active =
    link.to === "/ops"
      ? pathname === "/ops" ||
        pathname.startsWith("/ops/restaurants/") ||
        pathname === "/ops/new"
      : link.exact
        ? pathname === link.to
        : pathname.startsWith(link.to)
  const Icon = link.icon
  return (
    <Link
      to={link.to}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? link.label : undefined}
      title={compact ? link.label : undefined}
      className={`flex min-h-10 items-center gap-3 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      } ${active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-muted-foreground"}`}
    >
      <Icon className="size-4 shrink-0" weight={active ? "fill" : "regular"} />
      {compact ? null : link.label}
    </Link>
  )
}
