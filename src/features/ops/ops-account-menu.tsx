import { Menu } from "@base-ui/react/menu"
import {
  CaretUpDownIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"
import { useNavigate } from "@tanstack/react-router"

import { useTheme } from "@/components/theme-provider"

export function OpsAccountMenu({
  name,
  email,
  role,
  onSignOut,
  compact = false,
}: {
  name: string
  email: string
  role: string
  onSignOut: () => void
  compact?: boolean
}) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "O"
  const item =
    "flex min-h-10 cursor-default items-center gap-3 rounded-md px-3 text-sm outline-none data-highlighted:bg-muted"

  return (
    <Menu.Root>
      <Menu.Trigger
        className={`flex min-h-12 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring ${compact ? "w-auto" : ""}`}
        aria-label="Open operations account menu"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/20 text-xs font-semibold text-secondary">
          {initials}
        </span>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {role.toLowerCase()}
            </span>
          </span>
        )}
        {!compact && (
          <CaretUpDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side={compact ? "bottom" : "right"}
          align="end"
          sideOffset={8}
          className="z-50 outline-none"
        >
          <Menu.Popup className="min-w-60 rounded-lg bg-popover p-1.5 text-popover-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.1),0_12px_32px_oklch(0_0_0/0.15)] outline-none">
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <Menu.Item
              className={item}
              onClick={() => navigate({ to: "/ops/team" })}
            >
              <UsersThreeIcon aria-hidden="true" className="size-4" />
              Team
            </Menu.Item>
            <Menu.Item
              className={item}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <SunIcon aria-hidden="true" className="size-4" />
              ) : (
                <MoonIcon aria-hidden="true" className="size-4" />
              )}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Menu.Item>
            <div className="my-1 border-t border-border" />
            <Menu.Item
              className={`${item} text-destructive data-highlighted:bg-destructive/10`}
              onClick={onSignOut}
            >
              <SignOutIcon aria-hidden="true" className="size-4" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
