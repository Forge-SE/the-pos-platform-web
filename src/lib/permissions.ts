import type { AccessTokenProfile } from "@/lib/auth-token"

export const PERMISSIONS = [
  "ORDERS_CREATE",
  "ORDERS_ADVANCE",
  "PAYMENTS_RECORD",
  "SHIFTS_MANAGE",
  "MENU_MANAGE",
  "INVENTORY_VIEW",
  "INVENTORY_MANAGE",
  "STAFF_MANAGE",
  "REPORTS_VIEW",
  "SETTINGS_MANAGE",
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type StaffRole = "CASHIER" | "KITCHEN" | "MANAGER" | "OWNER"

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  CASHIER: ["ORDERS_CREATE", "PAYMENTS_RECORD", "SHIFTS_MANAGE"],
  KITCHEN: ["ORDERS_ADVANCE", "SHIFTS_MANAGE"],
  MANAGER: [...PERMISSIONS],
  OWNER: PERMISSIONS.filter((permission) => permission !== "ORDERS_ADVANCE"),
}

export const PERMISSION_META: Record<
  Permission,
  { label: string; description: string }
> = {
  ORDERS_CREATE: {
    label: "Take orders",
    description: "Create orders, apply discounts, and void orders.",
  },
  ORDERS_ADVANCE: {
    label: "Advance kitchen tickets",
    description: "Move tickets from NEW → PREPARING → READY → COMPLETED.",
  },
  PAYMENTS_RECORD: {
    label: "Record payments",
    description: "Record cash, transfer, and MoMo payments.",
  },
  SHIFTS_MANAGE: {
    label: "Manage shifts",
    description: "Open and close shifts and handle cash counts.",
  },
  MENU_MANAGE: {
    label: "Manage menu",
    description: "Create categories, items, modifiers, and availability.",
  },
  INVENTORY_VIEW: {
    label: "View inventory",
    description: "See stock balances, recipes, and movement history.",
  },
  INVENTORY_MANAGE: {
    label: "Manage inventory",
    description:
      "Receive stock, record waste and counts, and version meal recipes.",
  },
  STAFF_MANAGE: {
    label: "Manage staff",
    description: "View, create, and edit staff and their permissions.",
  },
  REPORTS_VIEW: {
    label: "View reports",
    description: "See sales totals, analytics, and staff performance.",
  },
  SETTINGS_MANAGE: {
    label: "Manage settings",
    description: "Edit branding, logo, and restaurant settings.",
  },
}

export function resolvePermissions(
  role: StaffRole,
  overrides?: { permission: string; granted: boolean }[]
): Permission[] {
  const resolved = new Set<Permission>(ROLE_PERMISSIONS[role])
  for (const override of overrides ?? []) {
    if (!(PERMISSIONS as readonly string[]).includes(override.permission))
      continue
    const permission = override.permission as Permission
    if (override.granted) resolved.add(permission)
    else resolved.delete(permission)
  }
  return [...resolved]
}

/**
 * Prefer explicit permissions on the token; fall back to role defaults
 * so older sessions issued before permissions existed keep working.
 */
export function hasPermission(
  profile: Pick<AccessTokenProfile, "role" | "permissions"> | null | undefined,
  permission: Permission
): boolean {
  if (!profile) return false
  if (profile.permissions) return profile.permissions.includes(permission)
  return ROLE_PERMISSIONS[profile.role].includes(permission)
}

export function permissionsForRole(role: StaffRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]]
}
