import { ChartBarIcon } from "@phosphor-icons/react"
import { MobileFloatingAction } from "@/components/mobile/mobile-floating-action"
import { useLanguage } from "@/components/language-provider"
import { MobileSheet } from "@/components/layout/mobile/mobile-sheet"
import { useMobilePanel } from "@/components/layout/mobile/use-mobile-panel"
import { SalesDigestCard } from "../sales-digest"

/** The overview's secondary action stays available without occupying a whole panel. */
export function SalesDigestAction() {
  const { t } = useLanguage()
  const panel = useMobilePanel("sales-digest")
  return (
    <>
      <MobileFloatingAction
        label={t("Open sales digest")}
        icon={ChartBarIcon}
        expanded={panel.open}
        onClick={() => panel.onOpenChange(true)}
      />
      <MobileSheet
        open={panel.open}
        onOpenChange={panel.onOpenChange}
        title="Sales digest"
        description="Review today's sales and email yesterday's digest."
      >
        <SalesDigestCard presentation="sheet" />
      </MobileSheet>
    </>
  )
}
