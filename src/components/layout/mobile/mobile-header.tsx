import { Link, useLocation } from "@tanstack/react-router"
import { MobileScreenHeader } from "@/components/mobile/mobile-screen-header"
import { useUrlState } from "@/lib/url-state"
import { mobileScreenTitle } from "./mobile-navigation-model"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { NotificationButton } from "@/components/layout/notification-button"
import { useLanguage } from "@/components/language-provider"
import { OvaalMark } from "@/components/ovaal-mark"
import { MobileProfile } from "@/components/layout/mobile/mobile-profile"
import type { AccessTokenProfile } from "@/lib/auth-token"

const MOBILE_IDENTITY = gql`
  query MobileIdentity {
    me {
      avatarUrl
    }
    restaurant {
      name
      code
    }
  }
`

export function MobileHeader({
  profile,
  onSignOut,
  onOpenSettings,
  onOpenPreferences,
  showNotifications = true,
  alarm,
}: {
  profile: AccessTokenProfile
  onSignOut: () => void
  onOpenSettings?: () => void
  onOpenPreferences?: () => void
  showNotifications?: boolean
  alarm?: ReactNode
}) {
  const { t } = useLanguage()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [desk] = useUrlState("desk")
  const [settings] = useUrlState("settings")
  const { data } = useQuery<{
    me: { avatarUrl: string | null }
    restaurant: { name: string; code: string }
  }>(MOBILE_IDENTITY)

  return (
    <MobileScreenHeader
      title={t(
        settings ? "Settings" : mobileScreenTitle(pathname, desk, profile.role)
      )}
      subtitle={data?.restaurant.name}
      leading={
        <Link
          to={
            profile.role === "CASHIER" || profile.role === "KITCHEN"
              ? "/orders"
              : "/overview"
          }
          aria-label={t("Workspace home")}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <OvaalMark elevated={false} />
        </Link>
      }
      actions={
        <>
          {alarm}
          {showNotifications && <NotificationButton />}
          <MobileProfile
            profile={profile}
            avatarUrl={data?.me.avatarUrl}
            restaurantName={data?.restaurant.name}
            restaurantCode={data?.restaurant.code}
            onSignOut={onSignOut}
            onOpenSettings={onOpenSettings}
            onOpenPreferences={onOpenPreferences}
          />
        </>
      }
    />
  )
}
