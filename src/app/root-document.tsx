import { HeadContent, Link, Outlet } from "@tanstack/react-router"
import { EmptyState, ErrorState } from "@/components/content-state"
import { Button } from "@/components/ui/button"

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
    <main className="flex min-h-svh flex-col bg-background p-4">
      <EmptyState
        title="Page not found."
        description="The requested page could not be found."
        action={
          <Button size="lg" render={<Link to="/" />}>
            Go to sign in
          </Button>
        }
      />
    </main>
  )
}

export function RouteErrorPage() {
  return (
    <main className="flex min-h-svh flex-col bg-background p-4">
      <ErrorState
        title="This page could not be loaded."
        description="Reload the page to try again."
        onRetry={() => window.location.reload()}
      />
    </main>
  )
}
