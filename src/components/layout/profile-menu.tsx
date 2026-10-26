import { Menu } from "@base-ui/react/menu"
import {
  DotsThreeCircleIcon,
  GearIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ProfileMenu({
  onSignOut,
  onOpenSettings,
}: {
  onSignOut: () => void
  onOpenSettings?: () => void
}) {
  const { theme, setTheme } = useTheme()
  const menuItemClass =
    "flex min-h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-xs font-medium outline-none select-none data-highlighted:bg-muted data-highlighted:text-foreground"

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open profile menu"
            title="Profile actions"
          />
        }
      >
        <DotsThreeCircleIcon aria-hidden="true" weight="bold" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="top"
          align="end"
          sideOffset={8}
          className="z-50 outline-none"
        >
          <Menu.Popup className="min-w-40 origin-[var(--transform-origin)] rounded-lg bg-popover p-1.5 text-popover-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.08),0_8px_24px_oklch(0.18_0.03_150/0.12)] transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none dark:shadow-[0_0_0_1px_oklch(1_0_0/0.1)]">
            {onOpenSettings && (
              <Menu.Item className={menuItemClass} onClick={onOpenSettings}>
                <GearIcon aria-hidden="true" className="size-4" />
                Settings
              </Menu.Item>
            )}
            <Menu.Item
              className={menuItemClass}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <SunIcon aria-hidden="true" className="size-4" />
              ) : (
                <MoonIcon aria-hidden="true" className="size-4" />
              )}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </Menu.Item>
            <Menu.Item
              className={`${menuItemClass} text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive`}
              onClick={onSignOut}
            >
              <SignOutIcon aria-hidden="true" className="size-4" />
              Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
