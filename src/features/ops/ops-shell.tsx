import { LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { useId, useState } from "react"
import { useMobileKeyboard } from "@/lib/use-mobile-keyboard"
import {
  mobileInstant,
  mobileSpring,
} from "@/components/layout/mobile/mobile-motion"
import { MobileSheet } from "@/components/layout/mobile/mobile-sheet"
import { useMobilePanel } from "@/components/layout/mobile/use-mobile-panel"
import { useRouterUrlState } from "@/lib/use-router-url-state"
import { MobileScreenHeader } from "@/components/mobile/mobile-screen-header"
import { Button } from "@/components/ui/button"
import {
  ListIcon,
  CaretDownIcon,
  HeartbeatIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  StorefrontIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useApolloClient, useQuery } from "@apollo/client/react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"

import { OvaalMark } from "@/components/ovaal-mark"
import { OpsAccountMenu } from "@/features/ops/ops-account-menu"
import { OpsNotifications } from "@/features/ops/ops-notifications"
import { useLanguage } from "@/components/language-provider"
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
  const { t } = useLanguage()
  return (
    <header className="flex min-h-[104px] w-full min-w-0 flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.035em] lg:text-3xl">
          {t(title)}
        </h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          {t(description)}
        </p>
      </div>
      {children ? (
        <div className="flex items-center gap-3">{children}</div>
      ) : null}
    </header>
  )
}

export function OpsShell({ children }: { children: ReactNode }) {
  useRouterUrlState()
  const { t } = useLanguage()
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
            {t("Platform")}
          </span>
        </div>
        <nav
          className="flex min-h-0 flex-1 [scrollbar-width:none] flex-col gap-3 overflow-y-auto px-3 py-5 [&::-webkit-scrollbar]:hidden [&>div]:shrink-0"
          aria-label="Platform"
        >
          <NavGroup
            label={t("Directory")}
            pathname={pathname}
            section="directory"
          />
          <NavGroup
            label={t("Insights")}
            pathname={pathname}
            section="insights"
          />
          <NavGroup
            label={t("Records")}
            pathname={pathname}
            section="records"
          />
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
          <span className="text-muted-foreground">{t("Platform")}</span>
          <span aria-hidden="true" className="text-muted-foreground/50">
            /
          </span>
          <span className="font-medium">{t(currentPage)}</span>
          <div className="ml-auto">
            <OpsNotifications />
          </div>
        </div>
        <div className="lg:hidden">
          <MobileScreenHeader
            title={t(currentPage)}
            subtitle={t("Platform")}
            leading={<OvaalMark />}
            actions={
              <>
                <OpsNotifications />
                <OpsAccountMenu
                  name={me?.name || "Operations"}
                  email={me?.email || ""}
                  role={me?.role || "MEMBER"}
                  onSignOut={() => void signOut()}
                  compact
                />
              </>
            }
          />
        </div>
        <OpsMobileNavigation pathname={pathname} />
        <div className="mobile-workspace content-page flex w-full min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}

function OpsMobileNavigation({ pathname }: { pathname: string }) {
  const { t } = useLanguage()
  const layoutId = useId()
  const reduced = useReducedMotion()
  const keyboardOpen = useMobileKeyboard()
  const panel = useMobilePanel("ops-navigation")
  const primary = links.filter(
    (link) =>
      link.to === "/ops" ||
      link.to === "/ops/metrics" ||
      link.to === "/ops/health"
  )
  const matches = (path: string) =>
    pathname === path ||
    (path === "/ops" &&
      (pathname.startsWith("/ops/restaurants/") || pathname === "/ops/new"))
  const moreActive = panel.open || !primary.some((link) => matches(link.to))
  const indicator = (
    <motion.span
      aria-hidden
      layoutId={reduced ? undefined : "ops-destination"}
      className="mobile-nav-indicator"
      transition={reduced ? mobileInstant : mobileSpring}
    />
  )
  return (
    <>
      <LayoutGroup id={layoutId}>
        <nav
          hidden={keyboardOpen}
          className="mobile-bottom-nav flex items-center gap-1 rounded-full bg-popover/95 p-1.5 shadow-lg ring-1 ring-border backdrop-blur-xl lg:hidden"
          aria-label={t("Platform navigation")}
        >
          {primary.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: true }}
              aria-current={matches(link.to) ? "page" : undefined}
              className={`mobile-nav-item ${matches(link.to) && !panel.open ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              {matches(link.to) && !panel.open && indicator}
              <link.icon aria-hidden className="size-5" />
              <span>{t(link.label)}</span>
            </Link>
          ))}
          <Button
            variant="ghost"
            className={`mobile-nav-item ${moreActive ? "text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => panel.onOpenChange(true)}
            aria-haspopup="dialog"
            aria-expanded={panel.open}
          >
            {moreActive && indicator}
            <ListIcon aria-hidden className="size-5" />
            {t("More")}
          </Button>
        </nav>
      </LayoutGroup>
      <MobileSheet
        open={panel.open}
        onOpenChange={panel.onOpenChange}
        title="Platform"
        description="Workspace navigation"
      >
        <nav className="grid gap-1" aria-label={t("More navigation")}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              replace
              onClick={panel.dismissForNavigation}
              className="flex min-h-14 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted"
            >
              <link.icon aria-hidden className="size-5" />
              {t(link.label)}
            </Link>
          ))}
        </nav>
      </MobileSheet>
    </>
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
  const { t } = useLanguage()
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
      aria-label={compact ? t(link.label) : undefined}
      title={compact ? t(link.label) : undefined}
      className={`flex min-h-10 items-center gap-3 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      } ${active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-muted-foreground"}`}
    >
      <Icon className="size-4 shrink-0" weight={active ? "fill" : "regular"} />
      {compact ? null : t(link.label)}
    </Link>
  )
}
