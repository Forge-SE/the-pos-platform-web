import type { Icon } from "@phosphor-icons/react"
import {
  ChartLineUpIcon,
  ForkKnifeIcon,
  GearSixIcon,
  HouseIcon,
  ReceiptIcon,
  SidebarIcon,
  UsersThreeIcon,
  WalletIcon,
} from "@phosphor-icons/react"
import { Link, useRouterState } from "@tanstack/react-router"

import { ProfileMenu } from "@/components/layout/profile-menu"
import { OvaalMark } from "@/components/ovaal-mark"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { AccessTokenProfile } from "@/lib/auth-token"

const roleLabels: Record<AccessTokenProfile["role"], string> = {
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  MANAGER: "Manager",
  OWNER: "Owner",
}

const primaryNavigation = [
  { label: "Overview", to: "/overview", icon: HouseIcon },
  { label: "Orders", to: "/orders", icon: ReceiptIcon },
  { label: "Performance", to: "/performance", icon: ChartLineUpIcon },
] as const

const managementNavigation = [
  { label: "Menu", to: "/menu", icon: ForkKnifeIcon },
  { label: "Shift & cash", to: "/shift", icon: WalletIcon },
  { label: "Team", to: "/team", icon: UsersThreeIcon },
  { label: "Settings", to: "/settings", icon: GearSixIcon },
] as const

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function NavigationSection({
  label,
  items,
  collapsed,
}: {
  label: string
  items: ReadonlyArray<{ label: string; to: string; icon: Icon }>
  collapsed: boolean
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <nav aria-label={label} className="mt-7 first:mt-8">
      {!collapsed && (
        <p className="px-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to
          return (
            <li key={item.label} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className={`h-6 w-[3px] shrink-0 rounded-full bg-secondary transition-opacity duration-150 ${active ? "opacity-100" : "opacity-0"}`}
              />
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={`flex min-h-10 flex-1 items-center rounded-lg text-xs font-medium transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 ${collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"} ${active ? "bg-primary/25 text-secondary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <item.icon
                  aria-hidden="true"
                  className="size-4"
                  weight={active ? "fill" : "regular"}
                />
                {!collapsed && item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function Sidebar({
  profile,
  collapsed,
  onCollapsedChange,
  onSignOut,
}: {
  profile: AccessTokenProfile
  collapsed: boolean
  onCollapsedChange: () => void
  onSignOut: () => void
}) {
  return (
    <aside
      className={`sticky top-2 hidden h-[calc(100svh-1rem)] flex-col py-4 lg:flex ${collapsed ? "px-2" : "px-3"}`}
    >
      <div
        className={`flex min-h-12 items-center ${collapsed ? "justify-center" : "gap-2"}`}
      >
        {!collapsed && (
          <Link
            to="/overview"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <OvaalMark elevated={false} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[-0.025em]">
                Ovaal
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                Point of Sale (POS)
              </span>
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCollapsedChange}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0"
        >
          <SidebarIcon
            aria-hidden="true"
            weight={collapsed ? "regular" : "fill"}
          />
        </Button>
      </div>

      <NavigationSection
        label="General"
        items={primaryNavigation}
        collapsed={collapsed}
      />
      <NavigationSection
        label="Manage"
        items={managementNavigation}
        collapsed={collapsed}
      />

      <div className="mt-auto border-t border-sidebar-border pt-4">
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-2"}`}
        >
          {!collapsed && (
            <>
              <Avatar size="lg">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {roleLabels[profile.role]}
                </p>
              </div>
            </>
          )}
          <ProfileMenu onSignOut={onSignOut} />
        </div>
      </div>
    </aside>
  )
}
