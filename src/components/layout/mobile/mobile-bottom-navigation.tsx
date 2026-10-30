import { useMobileKeyboard } from "@/lib/use-mobile-keyboard"
import { useId } from "react"
import { LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { mobileInstant, mobileSpring } from "./mobile-motion"
import { Link, useLocation } from "@tanstack/react-router"
import {
  DotsThreeOutlineIcon,
  CaretRightIcon,
  GearSixIcon,
} from "@phosphor-icons/react"
import { useLanguage } from "@/components/language-provider"
import type { AccessTokenProfile } from "@/lib/auth-token"
import { useUrlState } from "@/lib/url-state"
import { MobileSheet } from "./mobile-sheet"
import { useMobilePanel } from "./use-mobile-panel"
import {
  isMobileDestinationActive,
  mobileMoreNavigationFor,
  mobileNavigationFor,
} from "./mobile-navigation-model"

export function MobileBottomNavigation({
  profile,
  onOpenSettings,
  onOpenPreferences,
}: {
  profile: AccessTokenProfile
  onOpenSettings?: () => void
  onOpenPreferences: () => void
}) {
  const { t } = useLanguage()
  const layoutId = useId()
  const reducedMotion = useReducedMotion()
  const indicator = (selected: boolean) =>
    selected ? (
      <motion.span
        aria-hidden
        className="mobile-nav-indicator"
        layoutId={reducedMotion ? undefined : "active-destination"}
        transition={reducedMotion ? mobileInstant : mobileSpring}
      />
    ) : null
  const pathname = useLocation({ select: (location) => location.pathname })
  const [desk] = useUrlState("desk")
  const [settings] = useUrlState("settings")
  const panel = useMobilePanel("more")
  const keyboardOpen = useMobileKeyboard()
  const items = mobileNavigationFor(profile)
  const moreItems = mobileMoreNavigationFor(profile)
  const moreActive =
    Boolean(settings) ||
    !items.some((item) => isMobileDestinationActive(item, pathname, desk))

  return (
    <>
      <nav
        aria-label={t("Main navigation")}
        className="mobile-bottom-nav lg:hidden"
        hidden={keyboardOpen}
      >
        <LayoutGroup id={layoutId}>
          <div className="flex items-center gap-1 rounded-full bg-popover/95 p-1.5 text-popover-foreground shadow-[0_0_0_1px_var(--border),0_8px_28px_-8px_oklch(0_0_0/0.25)] backdrop-blur-xl">
            {items.map((item) => {
              const active =
                !settings && isMobileDestinationActive(item, pathname, desk)
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  activeOptions={{ exact: true }}
                  search={(previous) =>
                    active ? previous : item.desk ? { desk: item.desk } : {}
                  }
                  aria-current={active ? "page" : undefined}
                  className={`mobile-nav-item ${active && !panel.open ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {indicator(active && !panel.open)}
                  <item.icon
                    aria-hidden
                    className="size-5"
                    weight={active ? "fill" : "regular"}
                  />
                  <span>{t(item.label)}</span>
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => panel.onOpenChange(true)}
              aria-haspopup="dialog"
              aria-expanded={panel.open}
              aria-current={moreActive ? "page" : undefined}
              className={`mobile-nav-item ${moreActive || panel.open ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {indicator(moreActive || panel.open)}
              <DotsThreeOutlineIcon
                aria-hidden
                className="size-5"
                weight={moreActive || panel.open ? "fill" : "regular"}
              />
              <span>{t("More")}</span>
            </button>
          </div>
        </LayoutGroup>
      </nav>
      <MobileSheet
        open={panel.open}
        onOpenChange={panel.onOpenChange}
        title="Your workspace"
        description="Tools for your role, all in one place."
      >
        <nav aria-label={t("More navigation")} className="grid gap-1">
          {moreItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              search={item.desk ? { desk: item.desk } : {}}
              replace
              activeOptions={{ exact: true }}
              onClick={panel.dismissForNavigation}
              aria-current={
                isMobileDestinationActive(item, pathname, desk)
                  ? "page"
                  : undefined
              }
              className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-muted active:bg-muted aria-[current=page]:bg-primary/15"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <item.icon aria-hidden className="size-5" />
              </span>
              <span className="flex-1">{t(item.label)}</span>
              <CaretRightIcon
                aria-hidden
                className="size-4 text-muted-foreground"
              />
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              panel.dismissForNavigation()
              ;(onOpenSettings ?? onOpenPreferences)()
            }}
            className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium hover:bg-muted active:bg-muted"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <GearSixIcon aria-hidden className="size-5" />
            </span>
            <span className="flex-1">
              {t(onOpenSettings ? "Settings" : "Preferences")}
            </span>
            <CaretRightIcon
              aria-hidden
              className="size-4 text-muted-foreground"
            />
          </button>
        </nav>
      </MobileSheet>
    </>
  )
}
