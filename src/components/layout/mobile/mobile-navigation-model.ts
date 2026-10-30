import type { Icon } from "@phosphor-icons/react"
import {
  ChartLineUpIcon,
  CookingPotIcon,
  HouseIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  ClockCounterClockwiseIcon,
  WalletIcon,
} from "@phosphor-icons/react"
import { managementNavigation, seesManagementItem } from "../navigation-model"
import type { AccessTokenProfile } from "@/lib/auth-token"

export interface MobileDestination {
  id: string
  label: string
  to: string
  icon: Icon
  desk?: "status" | "history"
  view?: "sell" | "kitchen"
}

const overview: MobileDestination = {
  id: "overview",
  label: "Overview",
  to: "/overview",
  icon: HouseIcon,
}
const shift: MobileDestination = {
  id: "shift",
  label: "Shift",
  to: "/shift",
  icon: WalletIcon,
}

export function mobileNavigationFor(
  profile: AccessTokenProfile
): MobileDestination[] {
  if (profile.role === "CASHIER")
    return [
      {
        id: "sell",
        label: "Sell",
        to: "/orders",
        icon: ShoppingBagIcon,
        view: "sell",
      },
      {
        id: "orders",
        label: "Orders",
        to: "/orders",
        icon: CookingPotIcon,
        desk: "status",
      },
      {
        id: "history",
        label: "History",
        to: "/orders",
        icon: ClockCounterClockwiseIcon,
        desk: "history",
      },
    ]
  if (profile.role === "KITCHEN")
    return [
      { id: "kitchen", label: "Kitchen", to: "/orders", icon: CookingPotIcon },
      shift,
    ]
  return [
    overview,
    {
      id: "orders",
      label: "Orders",
      to: "/orders",
      icon: ReceiptIcon,
      ...(profile.role === "MANAGER" ? { desk: "history" as const } : {}),
    },
    {
      id: "performance",
      label: "Performance",
      to: "/performance",
      icon: ChartLineUpIcon,
    },
  ]
}

export function mobileMoreNavigationFor(
  profile: AccessTokenProfile
): MobileDestination[] {
  const primaryPaths = new Set(
    mobileNavigationFor(profile).map((item) => item.to)
  )
  const destinations: MobileDestination[] = []
  if (!primaryPaths.has("/overview")) destinations.push(overview)
  if (profile.role === "MANAGER")
    destinations.push({
      id: "kitchen",
      label: "Kitchen",
      to: "/orders",
      icon: CookingPotIcon,
      view: "kitchen",
    })
  for (const item of managementNavigation) {
    if (
      item.to === "/settings" ||
      primaryPaths.has(item.to) ||
      !seesManagementItem(profile, item)
    )
      continue
    destinations.push({ ...item, id: item.to })
  }
  return destinations
}

export function isMobileDestinationActive(
  item: MobileDestination,
  pathname: string,
  desk: string | null
) {
  if (pathname !== item.to) return false
  if (item.desk) return desk === item.desk
  if (item.view === "sell") return desk !== "status" && desk !== "history"
  if (item.view === "kitchen") return desk !== "history"
  return true
}

/** The shell owns the compact title; individual feature presenters own their content. */
export function mobileScreenTitle(
  pathname: string,
  desk: string | null,
  role: AccessTokenProfile["role"]
) {
  if (pathname === "/orders") {
    if (role === "KITCHEN") return "Kitchen"
    if (desk === "history" || role === "OWNER") return "Orders"
    if (role === "MANAGER") return "Kitchen"
    return desk === "status" ? "Order status" : "Counter"
  }
  const titles: Record<string, string> = {
    "/overview": "Overview",
    "/performance": "Performance",
    "/inventory": "Inventory",
    "/menu": "Menu",
    "/shift": "Shift & cash",
    "/team": "Team",
    "/customers": "Customers",
    "/taxes": "Taxes",
    "/discounts": "Discounts",
    "/settings": "Settings",
  }
  return titles[pathname] ?? "Your workspace"
}
