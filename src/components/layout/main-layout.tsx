import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import {
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"
import { useUrlState } from "@/lib/url-state"

import { MobileHeader } from "@/components/layout/mobile-header"
import { NotificationButton } from "@/components/layout/notification-button"
import { StationAlarm } from "@/features/orders/station-alarm"
import { ShiftBanner } from "@/components/layout/shift-banner"
import { OfflineSync } from "@/features/offline/offline-sync"
import { Sidebar } from "@/components/layout/sidebar"
import { RestaurantBranding } from "@/features/branding/restaurant-branding"
import { ErrorState } from "@/components/content-state"
import { clearAuthSession, getAccessTokenProfile } from "@/lib/auth-token"
import {
  APOLLO_RESTAURANT_SUSPENDED_EVENT,
  APOLLO_UNAUTHENTICATED_EVENT,
} from "@/lib/apollo-error-link"

const ONBOARDING_QUERY = gql`
  query OwnerOnboardingGate {
    ownerOnboardingRequired
  }
`

export function MainLayout() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsParam, setSettingsParam] = useUrlState("settings")
  const [settingsDismissed, setSettingsDismissed] = useState(false)
  const profile = getAccessTokenProfile()
  const [fullscreenParam] = useUrlState("fullscreen")
  const pathname = useLocation({ select: (location) => location.pathname })
  const [desk] = useUrlState("desk")
  const cashierCounter =
    profile?.role === "CASHIER" &&
    pathname === "/orders" &&
    desk !== "status" &&
    desk !== "history"
  const canOpenSettings =
    profile?.role === "OWNER" || profile?.role === "MANAGER"
  const settingsSection =
    settingsParam === "subscription" || settingsParam === "payouts"
      ? settingsParam
      : "restaurant"
  const settingsOpen =
    canOpenSettings &&
    !settingsDismissed &&
    (pathname === "/settings" ||
      settingsParam === "restaurant" ||
      settingsParam === "subscription" ||
      settingsParam === "payouts")

  useEffect(() => {
    setSettingsDismissed(false)
  }, [pathname])

  const fullscreen =
    (profile?.role === "CASHIER" ||
      profile?.role === "KITCHEN" ||
      profile?.role === "MANAGER") &&
    pathname === "/orders" &&
    fullscreenParam === "1"

  useEffect(() => {
    function onSuspended() {
      sessionStorage.setItem(
        "pos.suspended-notice",
        "This restaurant is suspended. Contact the platform team to restore access."
      )
      clearAuthSession()
      navigate({ to: "/", replace: true })
    }
    function onUnauthenticated() {
      clearAuthSession()
      navigate({ to: "/", replace: true })
    }
    window.addEventListener(APOLLO_RESTAURANT_SUSPENDED_EVENT, onSuspended)
    window.addEventListener(APOLLO_UNAUTHENTICATED_EVENT, onUnauthenticated)
    return () => {
      window.removeEventListener(APOLLO_RESTAURANT_SUSPENDED_EVENT, onSuspended)
      window.removeEventListener(
        APOLLO_UNAUTHENTICATED_EVENT,
        onUnauthenticated
      )
    }
  }, [navigate])

  const onboarding = useQuery<{ ownerOnboardingRequired: boolean }>(
    ONBOARDING_QUERY,
    {
      skip: profile?.role !== "OWNER",
      fetchPolicy: "network-only",
    }
  )

  if (!profile) return <Navigate to="/" replace />
  if (profile.role === "OWNER" && onboarding.error) {
    return (
      <main className="flex min-h-svh flex-col bg-background p-4">
        <ErrorState
          title="Could not load your workspace."
          onRetry={onboarding.refetch}
        />
      </main>
    )
  }
  if (
    (pathname === "/settings" ||
      pathname === "/performance" ||
      pathname === "/customers" ||
      pathname === "/taxes" ||
      pathname === "/discounts") &&
    profile.role !== "MANAGER" &&
    profile.role !== "OWNER"
  ) {
    return <Navigate to="/overview" replace />
  }
  if (profile.role === "OWNER" && onboarding.loading) {
    return <main className="min-h-svh bg-background" />
  }
  if (profile.role === "OWNER" && onboarding.data?.ownerOnboardingRequired) {
    return <Navigate to="/onboarding" replace />
  }

  function signOut() {
    clearAuthSession()
    navigate({ to: "/", replace: true })
  }

  function openSettings() {
    setSettingsDismissed(false)
    setSettingsParam(
      pathname === "/settings" &&
        new URLSearchParams(window.location.search).has("reference")
        ? "subscription"
        : "restaurant"
    )
  }

  function closeSettings() {
    setSettingsParam(null)
    if (pathname === "/settings") {
      setSettingsDismissed(true)
      navigate({ to: "/overview", replace: true })
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-sidebar lg:h-dvh lg:overflow-hidden">
      <div className={fullscreen ? "hidden" : "contents"}>
        <ShiftBanner />
        <OfflineSync />
      </div>
      <main
        className={
          fullscreen
            ? "flex h-dvh min-h-0 flex-1 flex-col overflow-hidden"
            : `flex min-h-0 flex-1 flex-col p-2 lg:grid lg:gap-2 lg:transition-[grid-template-columns] lg:duration-200 lg:ease-[cubic-bezier(0.2,0,0,1)] ${sidebarCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[220px_minmax(0,1fr)]"}`
        }
      >
        <div className={fullscreen ? "hidden" : "contents"}>
          <Sidebar
            profile={profile}
            collapsed={sidebarCollapsed}
            onCollapsedChange={() => setSidebarCollapsed((value) => !value)}
            onSignOut={signOut}
            onOpenSettings={canOpenSettings ? openSettings : undefined}
          />
        </div>

        <section
          className={
            fullscreen
              ? "min-h-0 flex-1 overflow-hidden bg-card text-card-foreground"
              : "pos-workspace relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/35 bg-card text-card-foreground lg:h-full lg:overflow-y-auto"
          }
        >
          <div className={fullscreen ? "hidden" : "contents"}>
            <MobileHeader
              profile={profile}
              onSignOut={signOut}
              onOpenSettings={canOpenSettings ? openSettings : undefined}
              showNotifications={!cashierCounter}
            />
          </div>
          {!cashierCounter && (
            <div
              className={
                fullscreen
                  ? "hidden"
                  : "pointer-events-none absolute top-8 right-8 z-30 hidden lg:block"
              }
            >
              <div className="pointer-events-auto">
                <NotificationButton />
              </div>
            </div>
          )}
          {!cashierCounter && <StationAlarm fullscreen={fullscreen} />}
          <Outlet />
        </section>
      </main>
      {settingsOpen && (
        <RestaurantBranding
          open
          section={
            settingsParam === "subscription" ||
            settingsParam === "payouts" ||
            settingsParam === "restaurant"
              ? settingsParam
              : pathname === "/settings" &&
                  new URLSearchParams(window.location.search).has("reference")
                ? "subscription"
                : settingsSection
          }
          onSectionChange={setSettingsParam}
          onOpenChange={(next) => {
            if (!next) closeSettings()
          }}
        />
      )}
    </div>
  )
}
