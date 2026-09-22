import { Link } from "@tanstack/react-router"

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
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
      <Link
        to="/overview"
        className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
      >
        <OvaalMark elevated={false} />
        <span className="font-semibold tracking-[-0.025em]">Ovaal</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {profile.name}
        </span>
        <ProfileMenu onSignOut={onSignOut} />
      </div>
    </div>
  )
}
