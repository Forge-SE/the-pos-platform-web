import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import {
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"
import { useUrlState } from "@/lib/url-state"
import { useMediaQuery } from "@/lib/use-media-query"
import { useRouterUrlState } from "@/lib/use-router-url-state"

import { MobileHeader } from "@/components/layout/mobile/mobile-header"
import { MobileBottomNavigation } from "@/components/layout/mobile/mobile-bottom-navigation"
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
  const compact = useMediaQuery("(max-width: 1023px)")
  useRouterUrlState()
  const noticesRef = useRef<HTMLDivElement>(null)
  const [noticeHeight, setNoticeHeight] = useState(0)
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsParam, setSettingsParam] = useUrlState("settings")
  const mobileSettingsOpenedHere = useRef(false)
  const [, pushSettingsParam] = useUrlState("settings", "push")
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
    !settingsDismissed &&
    (settingsParam === "preferences" ||
      (canOpenSettings &&
        (pathname === "/settings" ||
          settingsParam === "restaurant" ||
          settingsParam === "subscription" ||
          settingsParam === "payouts")))

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

  useEffect(() => {
    const notices = noticesRef.current
    if (!notices) return
    const update = () =>
      setNoticeHeight(compact ? notices.getBoundingClientRect().height : 0)
    update()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(update)
    observer.observe(notices)
    return () => observer.disconnect()
  }, [compact, onboarding.loading, profile?.sub])

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
    profile.role !== "OWNER" &&
    !(pathname === "/settings" && settingsParam === "preferences")
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
    if (compact) {
      setSettingsDismissed(false)
      if (settingsOpen) setSettingsParam("restaurant")
      else {
        mobileSettingsOpenedHere.current = true
        pushSettingsParam("restaurant")
      }
      return
    }
    setSettingsDismissed(false)
    setSettingsParam(
      pathname === "/settings" &&
        new URLSearchParams(window.location.search).has("reference")
        ? "subscription"
        : "restaurant"
    )
  }

  function openPreferences() {
    if (compact) {
      setSettingsDismissed(false)
      if (settingsOpen) setSettingsParam("preferences")
      else {
        mobileSettingsOpenedHere.current = true
        pushSettingsParam("preferences")
      }
      return
    }
    setSettingsDismissed(false)
    setSettingsParam("preferences")
  }

  function closeSettings() {
    if (
      compact &&
      mobileSettingsOpenedHere.current &&
      pathname !== "/settings"
    ) {
      mobileSettingsOpenedHere.current = false
      window.history.back()
      return
    }
    setSettingsParam(null)
    if (pathname === "/settings") {
      setSettingsDismissed(true)
      navigate({ to: "/overview", replace: true })
    }
  }

  return (
    <div
      className="mobile-app-shell flex min-h-svh flex-col bg-sidebar lg:h-dvh lg:overflow-hidden"
      style={{ "--mobile-notice-offset": `${noticeHeight}px` } as CSSProperties}
    >
      <div
        ref={noticesRef}
        className={
          fullscreen
            ? "hidden"
            : "mobile-workspace-notices sticky top-0 z-40 lg:contents"
        }
      >
        <ShiftBanner />
        <OfflineSync />
      </div>
      <main
        className={
          fullscreen
            ? "flex h-dvh min-h-0 flex-1 flex-col overflow-hidden"
            : `flex min-h-0 flex-1 flex-col lg:grid lg:gap-2 lg:p-2 lg:transition-[grid-template-columns] lg:duration-200 lg:ease-[cubic-bezier(0.2,0,0,1)] ${sidebarCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[220px_minmax(0,1fr)]"}`
        }
      >
        <div className={fullscreen ? "hidden" : "contents"}>
          <Sidebar
            profile={profile}
            collapsed={sidebarCollapsed}
            onCollapsedChange={() => setSidebarCollapsed((value) => !value)}
            onSignOut={signOut}
            onOpenSettings={canOpenSettings ? openSettings : undefined}
            onOpenPreferences={openPreferences}
          />
        </div>

        <section
          className={
            fullscreen
              ? "min-h-0 flex-1 overflow-hidden bg-card text-card-foreground"
              : "pos-workspace mobile-workspace relative min-h-0 min-w-0 flex-1 bg-card text-card-foreground lg:h-full lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border/35"
          }
        >
          {!fullscreen && compact && (
            <MobileHeader
              profile={profile}
              onSignOut={signOut}
              onOpenSettings={canOpenSettings ? openSettings : undefined}
              onOpenPreferences={openPreferences}
              showNotifications
              alarm={<StationAlarm inline />}
            />
          )}
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
          {!cashierCounter && (!compact || fullscreen) && (
            <StationAlarm fullscreen={fullscreen} />
          )}
          <div
            hidden={compact && settingsOpen}
            className={compact && settingsOpen ? "hidden" : "contents"}
            inert={compact && settingsOpen ? true : undefined}
          >
            <Outlet />
          </div>
          {compact && settingsOpen && (
            <RestaurantBranding
              open
              section={
                settingsParam === "subscription" ||
                settingsParam === "payouts" ||
                settingsParam === "preferences"
                  ? settingsParam
                  : "restaurant"
              }
              onSectionChange={setSettingsParam}
              onOpenChange={(next) => {
                if (!next) closeSettings()
              }}
            />
          )}
        </section>
      </main>
      {!fullscreen && compact && (
        <MobileBottomNavigation
          profile={profile}
          onOpenSettings={canOpenSettings ? openSettings : undefined}
          onOpenPreferences={openPreferences}
        />
      )}
      {settingsOpen && !compact && (
        <RestaurantBranding
          open
          section={
            settingsParam === "subscription" ||
            settingsParam === "payouts" ||
            settingsParam === "restaurant" ||
            settingsParam === "preferences"
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
