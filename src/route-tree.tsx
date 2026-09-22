import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"

import { AppRoot, NotFoundPage } from "@/app/root-document"

const rootRoute = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "POS Platform" },
    ],
  }),
  component: AppRoot,
  notFoundComponent: NotFoundPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() => import("@/pages/Login"), "Login"),
  head: () => ({
    meta: [
      { title: "Sign in | POS Platform" },
      {
        name: "description",
        content: "Sign in to your restaurant workspace.",
      },
    ],
  }),
})

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_app",
  component: lazyRouteComponent(
    () => import("@/components/layout/main-layout"),
    "MainLayout"
  ),
})

const overviewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/overview",
  component: lazyRouteComponent(() => import("@/pages/Overview"), "Overview"),
  head: () => ({
    meta: [
      { title: "Overview | Ovaal" },
      {
        name: "description",
        content: "Your restaurant's live operations overview.",
      },
    ],
  }),
})

const ordersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/orders",
  component: lazyRouteComponent(() => import("@/pages/Orders"), "Orders"),
  head: () => ({ meta: [{ title: "Orders | Ovaal" }] }),
})

const performanceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/performance",
  component: lazyRouteComponent(
    () => import("@/pages/Performance"),
    "Performance"
  ),
  head: () => ({ meta: [{ title: "Performance | Ovaal" }] }),
})

const teamRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/team",
  component: lazyRouteComponent(() => import("@/pages/Team"), "Team"),
  head: () => ({ meta: [{ title: "Team | Ovaal" }] }),
})

const shiftRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/shift",
  component: lazyRouteComponent(() => import("@/pages/Shift"), "Shift"),
  head: () => ({ meta: [{ title: "Shift & cash | Ovaal" }] }),
})

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: lazyRouteComponent(() => import("@/pages/Settings"), "Settings"),
  head: () => ({ meta: [{ title: "Settings | Ovaal" }] }),
})

const legacyDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: () => {
    throw redirect({ to: "/overview", replace: true })
  },
})

const noIndexMeta = [{ name: "robots", content: "noindex, nofollow" }]

// Internal platform-admin area. Deliberately unlisted: no nav links point
// here, unauthenticated visits render the 404 page, and the API enforces
// PLATFORM_ADMIN on every resolver via requirePlatformAdmin.
const opsLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ops/login",
  component: lazyRouteComponent(() => import("@/pages/OpsLogin"), "OpsLogin"),
  head: () => ({
    meta: [{ title: "Platform admin | POS Platform" }, ...noIndexMeta],
  }),
})

const opsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ops",
  component: lazyRouteComponent(() => import("@/pages/Ops"), "Ops"),
  head: () => ({
    meta: [{ title: "Platform overview | POS Platform" }, ...noIndexMeta],
  }),
})

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appLayoutRoute.addChildren([
    overviewRoute,
    ordersRoute,
    performanceRoute,
    teamRoute,
    shiftRoute,
    settingsRoute,
  ]),
  legacyDashboardRoute,
  opsLoginRoute,
  opsRoute,
])
