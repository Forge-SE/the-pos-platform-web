import type { ReactNode } from "react"
import { FunnelIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { MobileSheet } from "@/components/layout/mobile/mobile-sheet"
import { useMobilePanel } from "@/components/layout/mobile/use-mobile-panel"
import { useLanguage } from "@/components/language-provider"

export function MobileTableFilters({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const panel = useMobilePanel(`filters-${label}`)
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => panel.onOpenChange(true)}
        aria-haspopup="dialog"
        aria-expanded={panel.open}
      >
        <FunnelIcon aria-hidden />
        {t("Filters")}
      </Button>
      <MobileSheet
        open={panel.open}
        onOpenChange={(open) =>
          open ? panel.onOpenChange(true) : panel.dismissForNavigation()
        }
        title="Filters"
        description={label}
      >
        <div className="mobile-filter-fields flex flex-col gap-4">
          {children}
        </div>
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={panel.dismissForNavigation}
        >
          {t("Show results")}
        </Button>
      </MobileSheet>
    </>
  )
}
