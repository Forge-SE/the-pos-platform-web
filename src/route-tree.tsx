import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"

import { AppRoot, NotFoundPage, RouteErrorPage } from "@/app/root-document"

const rootRoute = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "POS Platform" },
    ],
  }),
  component: AppRoot,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
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
  validateSearch: (
    search: Record<string, unknown>
  ): { desk?: "status" | "history" } => ({
    ...search,
    desk:
      search.desk === "status" || search.desk === "history"
        ? search.desk
        : undefined,
  }),
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

const customersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/customers",
  component: lazyRouteComponent(() => import("@/pages/Customers"), "Customers"),
  head: () => ({ meta: [{ title: "Customers | Ovaal" }] }),
})

const shiftRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/shift",
  component: lazyRouteComponent(() => import("@/pages/Shift"), "Shift"),
  head: () => ({ meta: [{ title: "Shift & cash | Ovaal" }] }),
})

const menuRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/menu",
  component: lazyRouteComponent(() => import("@/pages/Menu"), "Menu"),
  head: () => ({ meta: [{ title: "Menu | Ovaal" }] }),
})

const taxesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/taxes",
  component: lazyRouteComponent(() => import("@/pages/Taxes"), "Taxes"),
  head: () => ({ meta: [{ title: "Taxes | Ovaal" }] }),
})

const inventoryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/inventory",
  component: lazyRouteComponent(() => import("@/pages/Inventory"), "Inventory"),
  head: () => ({ meta: [{ title: "Inventory | Ovaal" }] }),
})

const discountsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/discounts",
  component: lazyRouteComponent(() => import("@/pages/Discounts"), "Discounts"),
  head: () => ({ meta: [{ title: "Discounts | Ovaal" }] }),
})

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  validateSearch: (search: Record<string, unknown>): { settings?: string } => ({
    ...search,
    settings: typeof search.settings === "string" ? search.settings : undefined,
  }),
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

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: lazyRouteComponent(
    () => import("@/pages/Onboarding"),
    "Onboarding"
  ),
  head: () => ({
    meta: [
      { title: "Set up your till | Ovaal" },
      {
        name: "description",
        content: "Add your team and opening menu the first time you sign in.",
      },
    ],
  }),
})

const opsLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ops/login",
  component: lazyRouteComponent(() => import("@/pages/OpsLogin"), "OpsLogin"),
  head: () => ({
    meta: [{ title: "Platform admin | POS Platform" }, ...noIndexMeta],
  }),
})

const opsAcceptRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ops/accept",
  component: lazyRouteComponent(() => import("@/pages/OpsAccept"), "OpsAccept"),
  head: () => ({
    meta: [{ title: "Join operations | Platform" }, ...noIndexMeta],
  }),
})

const opsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_ops",
  component: lazyRouteComponent(() => import("@/pages/Ops"), "Ops"),
})

const opsRestaurantsRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops",
  component: lazyRouteComponent(
    () => import("@/pages/OpsRestaurants"),
    "OpsRestaurants"
  ),
  head: () => ({
    meta: [{ title: "Restaurants | Platform" }, ...noIndexMeta],
  }),
})

const opsProvisionRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/new",
  component: lazyRouteComponent(
    () => import("@/pages/OpsProvision"),
    "OpsProvision"
  ),
  head: () => ({
    meta: [{ title: "Add restaurant | Platform" }, ...noIndexMeta],
  }),
})

const opsRestaurantDetailRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/restaurants/$restaurantId",
  validateSearch: (
    search: Record<string, unknown>
  ): { tab: "general" | "payments" | "compliance" | "audit" } => ({
    tab:
      search.tab === "payments" ||
      search.tab === "compliance" ||
      search.tab === "audit"
        ? search.tab
        : "general",
  }),
  component: lazyRouteComponent(
    () => import("@/pages/OpsRestaurant"),
    "OpsRestaurant"
  ),
  head: () => ({ meta: [{ title: "Restaurant | Platform" }, ...noIndexMeta] }),
})

const opsMetricsRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/metrics",
  component: lazyRouteComponent(
    () => import("@/pages/OpsMetrics"),
    "OpsMetrics"
  ),
  head: () => ({
    meta: [{ title: "Metrics | Platform" }, ...noIndexMeta],
  }),
})

const opsSubscriptionsRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/subscriptions",
  component: lazyRouteComponent(
    () => import("@/pages/OpsSubscriptions"),
    "OpsSubscriptions"
  ),
  head: () => ({
    meta: [{ title: "Subscriptions | Platform" }, ...noIndexMeta],
  }),
})

const opsSubscriptionTierRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/subscriptions/$tierId",
  validateSearch: (
    search: Record<string, unknown>
  ): { tab: "analytics" | "renewals" | "restaurants" } => ({
    tab:
      search.tab === "renewals" || search.tab === "restaurants"
        ? search.tab
        : "analytics",
  }),
  component: lazyRouteComponent(
    () => import("@/pages/OpsSubscriptionTier"),
    "OpsSubscriptionTierPage"
  ),
  head: () => ({
    meta: [{ title: "Subscription tier | Platform" }, ...noIndexMeta],
  }),
})

const opsHealthRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/health",
  component: lazyRouteComponent(() => import("@/pages/OpsHealth"), "OpsHealth"),
  head: () => ({
    meta: [{ title: "Pilot health | Platform" }, ...noIndexMeta],
  }),
})

const opsTeamRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/team",
  component: lazyRouteComponent(() => import("@/pages/OpsTeam"), "OpsTeam"),
  head: () => ({ meta: [{ title: "Team | Platform" }, ...noIndexMeta] }),
})

const opsAuditRoute = createRoute({
  getParentRoute: () => opsLayoutRoute,
  path: "/ops/audit",
  component: lazyRouteComponent(() => import("@/pages/OpsAudit"), "OpsAudit"),
  head: () => ({
    meta: [{ title: "Audit log | Platform" }, ...noIndexMeta],
  }),
})

export const routeTree = rootRoute.addChildren([
  loginRoute,
  appLayoutRoute.addChildren([
    overviewRoute,
    ordersRoute,
    performanceRoute,
    teamRoute,
    customersRoute,
    menuRoute,
    inventoryRoute,
    shiftRoute,
    taxesRoute,
    discountsRoute,
    settingsRoute,
  ]),
  legacyDashboardRoute,
  onboardingRoute,
  opsLoginRoute,
  opsAcceptRoute,
  opsLayoutRoute.addChildren([
    opsRestaurantsRoute,
    opsRestaurantDetailRoute,
    opsProvisionRoute,
    opsMetricsRoute,
    opsHealthRoute,
    opsTeamRoute,
    opsSubscriptionsRoute,
    opsSubscriptionTierRoute,
    opsAuditRoute,
  ]),
])
