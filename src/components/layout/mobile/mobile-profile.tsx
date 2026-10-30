import {
  CaretRightIcon,
  GearSixIcon,
  GlobeIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react"
import type { AccessTokenProfile } from "@/lib/auth-token"
import { useLanguage } from "@/components/language-provider"
import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MobileSheet } from "./mobile-sheet"
import { useMobilePanel } from "./use-mobile-panel"

const roles = {
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  MANAGER: "Manager",
  OWNER: "Owner",
}

export function MobileProfile({
  profile,
  avatarUrl,
  restaurantName,
  restaurantCode,
  onSignOut,
  onOpenSettings,
  onOpenPreferences,
}: {
  profile: AccessTokenProfile
  avatarUrl?: string | null
  restaurantName?: string
  restaurantCode?: string
  onSignOut: () => void
  onOpenSettings?: () => void
  onOpenPreferences?: () => void
}) {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const panel = useMobilePanel("account")
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  const avatar = (large = false) => (
    <Avatar className={large ? "size-14" : "size-9"}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
  const openSection = (callback: () => void) => {
    panel.dismissForNavigation()
    callback()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        className="rounded-full"
        aria-label={t("Open your profile")}
        aria-haspopup="dialog"
        aria-expanded={panel.open}
        onClick={() => panel.onOpenChange(true)}
      >
        {avatar()}
      </Button>
      <MobileSheet
        open={panel.open}
        onOpenChange={panel.onOpenChange}
        title="Your account"
        description="Your profile and workspace preferences."
      >
        <div className="flex items-center gap-4 rounded-2xl bg-muted/50 p-4">
          {avatar(true)}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{profile.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t(roles[profile.role])}
            </p>
            {restaurantName && (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {restaurantName}
                {restaurantCode ? ` · ${restaurantCode}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {t("Appearance")}
          </p>
          <div
            role="group"
            aria-label={t("Appearance")}
            className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
          >
            {(
              [
                { value: "light", label: "Light", icon: SunIcon },
                { value: "dark", label: "Dark", icon: MoonIcon },
              ] as const
            ).map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className="h-11 rounded-lg aria-pressed:bg-card aria-pressed:shadow-xs"
                aria-pressed={theme === option.value}
                onClick={() => setTheme(option.value)}
              >
                <option.icon aria-hidden className="size-4" />
                {t(option.label)}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-1">
          {onOpenPreferences && (
            <Button
              variant="ghost"
              className="h-14 justify-start rounded-xl px-3"
              onClick={() => openSection(onOpenPreferences)}
            >
              <GlobeIcon
                aria-hidden
                className="mr-2 size-5 text-muted-foreground"
              />
              <span className="flex-1 text-left">
                {t("Language & preferences")}
              </span>
              <CaretRightIcon
                aria-hidden
                className="size-4 text-muted-foreground"
              />
            </Button>
          )}
          {onOpenSettings && (
            <Button
              variant="ghost"
              className="h-14 justify-start rounded-xl px-3"
              onClick={() => openSection(onOpenSettings)}
            >
              <GearSixIcon
                aria-hidden
                className="mr-2 size-5 text-muted-foreground"
              />
              <span className="flex-1 text-left">
                {t("Restaurant settings")}
              </span>
              <CaretRightIcon
                aria-hidden
                className="size-4 text-muted-foreground"
              />
            </Button>
          )}
        </div>
        <div className="mt-4 border-t border-dashed border-border pt-4">
          <Button
            variant="destructive"
            className="h-12 w-full rounded-xl"
            onClick={() => openSection(onSignOut)}
          >
            <SignOutIcon aria-hidden className="size-5" />
            {t("Log out")}
          </Button>
        </div>
      </MobileSheet>
    </>
  )
}
