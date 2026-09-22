import { HeadContent, Outlet } from "@tanstack/react-router"

import { BootLoader } from "@/components/boot-loader"
import { Providers } from "@/providers"

export function AppRoot() {
  return (
    <Providers>
      <BootLoader />
      <HeadContent />
      <Outlet />
    </Providers>
  )
}

export function NotFoundPage() {
  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  )
}
