import type { Icon } from "@phosphor-icons/react"
import {
  ChartLineUpIcon,
  CookingPotIcon,
  PackageIcon,
  ForkKnifeIcon,
  GearSixIcon,
  HouseIcon,
  PercentIcon,
  ReceiptIcon,
  TicketIcon,
  UsersThreeIcon,
  WalletIcon,
} from "@phosphor-icons/react"
import type { AccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"
import type { Permission } from "@/lib/permissions"

export function primaryNavigationFor(role: AccessTokenProfile["role"]) {
  const kitchen = role === "KITCHEN" || role === "MANAGER"
  const links = [
    { label: "Overview", to: "/overview", icon: HouseIcon },
    {
      label: kitchen ? "Kitchen" : "Orders",
      to: "/orders",
      icon: kitchen ? CookingPotIcon : ReceiptIcon,
    },
  ]
  if (role === "MANAGER" || role === "OWNER") {
    links.push({
      label: "Performance",
      to: "/performance",
      icon: ChartLineUpIcon,
    })
  }
  return links
}

export const managementNavigation = [
  {
    label: "Inventory",
    to: "/inventory",
    icon: PackageIcon,
    permission: "INVENTORY_VIEW",
  },
  {
    label: "Menu",
    to: "/menu",
    icon: ForkKnifeIcon,
    permission: "MENU_MANAGE",
  },
  {
    label: "Shift & cash",
    to: "/shift",
    icon: WalletIcon,
    permission: "SHIFTS_MANAGE",
  },
  {
    label: "Team",
    to: "/team",
    icon: UsersThreeIcon,
    permission: "STAFF_MANAGE",
  },
  {
    label: "Customers",
    to: "/customers",
    icon: UsersThreeIcon,
    permission: "REPORTS_VIEW",
  },
  {
    label: "Taxes",
    to: "/taxes",
    icon: PercentIcon,
    permission: "SETTINGS_MANAGE",
  },
  {
    label: "Discounts",
    to: "/discounts",
    icon: TicketIcon,
    permission: "SETTINGS_MANAGE",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: GearSixIcon,
    permission: "SETTINGS_MANAGE",
  },
] as const satisfies ReadonlyArray<{
  label: string
  to: string
  icon: Icon
  permission: Permission
}>

export function seesManagementItem(
  profile: AccessTokenProfile,
  item: (typeof managementNavigation)[number]
) {
  if (
    item.to === "/settings" ||
    item.to === "/customers" ||
    item.to === "/taxes" ||
    item.to === "/discounts"
  ) {
    return profile.role === "MANAGER" || profile.role === "OWNER"
  }
  if (item.to === "/shift") return true
  return hasPermission(profile, item.permission)
}
