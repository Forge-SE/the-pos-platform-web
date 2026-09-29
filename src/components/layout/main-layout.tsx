import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Navigate, Outlet, useNavigate } from "@tanstack/react-router"

import { MobileHeader } from "@/components/layout/mobile-header"
import { ShiftBanner } from "@/components/layout/shift-banner"
import { Sidebar } from "@/components/layout/sidebar"
import { clearAccessToken, getAccessTokenProfile } from "@/lib/auth-token"
import { APOLLO_RESTAURANT_SUSPENDED_EVENT } from "@/lib/apollo-error-link"

const ONBOARDING_QUERY = gql`
  query OwnerOnboardingGate {
    ownerOnboardingRequired
  }
`

export function MainLayout() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const profile = getAccessTokenProfile()

  useEffect(() => {
    function onSuspended() {
      sessionStorage.setItem(
        "pos.suspended-notice",
        "This restaurant is suspended. Contact the platform team to restore access."
      )
      clearAccessToken()
      navigate({ to: "/", replace: true })
    }
    window.addEventListener(APOLLO_RESTAURANT_SUSPENDED_EVENT, onSuspended)
    return () =>
      window.removeEventListener(APOLLO_RESTAURANT_SUSPENDED_EVENT, onSuspended)
  }, [navigate])

  const onboarding = useQuery<{ ownerOnboardingRequired: boolean }>(
    ONBOARDING_QUERY,
    {
      skip: profile?.role !== "OWNER",
      fetchPolicy: "network-only",
    }
  )

  if (!profile) return <Navigate to="/" replace />
  if (profile.role === "OWNER" && onboarding.loading) {
    return <main className="min-h-svh bg-background" />
  }
  if (profile.role === "OWNER" && onboarding.data?.ownerOnboardingRequired) {
    return <Navigate to="/onboarding" replace />
  }

  function signOut() {
    clearAccessToken()
    navigate({ to: "/", replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-sidebar lg:h-dvh lg:overflow-hidden">
      <ShiftBanner />
      <main
        className={`flex min-h-0 flex-1 flex-col p-2 lg:grid lg:gap-2 lg:transition-[grid-template-columns] lg:duration-200 lg:ease-[cubic-bezier(0.2,0,0,1)] ${sidebarCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[220px_minmax(0,1fr)]"}`}
      >
        <Sidebar
          profile={profile}
          collapsed={sidebarCollapsed}
          onCollapsedChange={() => setSidebarCollapsed((value) => !value)}
          onSignOut={signOut}
        />

        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/35 bg-card text-card-foreground lg:h-full lg:overflow-y-auto">
          <MobileHeader profile={profile} onSignOut={signOut} />
          <Outlet />
        </section>
      </main>
    </div>
  )
}
