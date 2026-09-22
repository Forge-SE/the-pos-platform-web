import { useState } from "react"
import { Navigate, Outlet, useNavigate } from "@tanstack/react-router"

import { MobileHeader } from "@/components/layout/mobile-header"
import { Sidebar } from "@/components/layout/sidebar"
import { clearAccessToken, getAccessTokenProfile } from "@/lib/auth-token"

export function MainLayout() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const profile = getAccessTokenProfile()

  if (!profile) return <Navigate to="/" replace />

  function signOut() {
    clearAccessToken()
    navigate({ to: "/", replace: true })
  }

  return (
    <main
      className={`min-h-svh bg-sidebar p-2 lg:grid lg:gap-2 lg:transition-[grid-template-columns] lg:duration-200 lg:ease-[cubic-bezier(0.2,0,0,1)] ${sidebarCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[220px_minmax(0,1fr)]"}`}
    >
      <Sidebar
        profile={profile}
        collapsed={sidebarCollapsed}
        onCollapsedChange={() => setSidebarCollapsed((value) => !value)}
        onSignOut={signOut}
      />

      <section className="min-h-[calc(100svh-1rem)] overflow-hidden rounded-2xl border border-border/35 bg-card text-card-foreground">
        <MobileHeader profile={profile} onSignOut={signOut} />
        <Outlet />
      </section>
    </main>
  )
}
