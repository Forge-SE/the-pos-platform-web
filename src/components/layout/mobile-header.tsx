import { Link, useRouterState } from "@tanstack/react-router"

import {
  managementNavigation,
  primaryNavigationFor,
  seesManagementItem,
} from "@/components/layout/sidebar"
import { NotificationButton } from "@/components/layout/notification-button"
import { OvaalMark } from "@/components/ovaal-mark"
import { ProfileMenu } from "@/components/layout/profile-menu"
import type { AccessTokenProfile } from "@/lib/auth-token"

export function MobileHeader({
  profile,
  onSignOut,
}: {
  profile: AccessTokenProfile
  onSignOut: () => void
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const links = [
    ...primaryNavigationFor(profile.role),
    ...managementNavigation.filter((item) => seesManagementItem(profile, item)),
  ]

  return (
    <div className="border-b lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          to="/overview"
          className="flex items-center gap-2.5 rounded-lg font-brand focus-visible:outline-2 focus-visible:outline-ring"
        >
          <OvaalMark elevated={false} />
          <span className="font-semibold tracking-[-0.025em]">Ovaal</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {profile.name}
          </span>
          <NotificationButton />
          <ProfileMenu onSignOut={onSignOut} />
        </div>
      </div>
      <nav
        aria-label="Point of sale"
        className="flex gap-1 overflow-x-auto px-3 pb-3"
      >
        {links.map((item) => {
          const active = pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-primary/25 text-secondary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <item.icon
                aria-hidden="true"
                className="size-4"
                weight={active ? "fill" : "regular"}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
