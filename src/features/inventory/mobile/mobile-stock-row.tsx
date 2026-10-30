import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/language-provider"
import { displayQuantity } from "../model"
import type { StockItem } from "../model"

export function MobileStockRow({
  item,
  canManage,
  onAction,
  availablePercent,
  reservedPercent,
  needsAttention,
}: {
  item: StockItem
  canManage: boolean
  onAction: (kind: "RECEIPT" | "WASTE" | "COUNT") => void
  availablePercent: number
  reservedPercent: number
  needsAttention: boolean
}) {
  const { t } = useLanguage()
  return (
    <article
      data-mobile-stock-row
      className="border-b border-border/60 py-4 last:border-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold break-words">{item.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Reorder at")} {displayQuantity(item.reorderLevel, item.unit)}
          </p>
        </div>
        <div className="max-w-[45%] shrink-0 text-right">
          <p className="text-base font-semibold break-words tabular-nums">
            {displayQuantity(item.available, item.unit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Available")}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <span>
          {t("On hand")} {displayQuantity(item.onHand, item.unit)}
        </span>
        <span>
          {t("Reserved")} {displayQuantity(item.reserved, item.unit)}
        </span>
        <Badge variant={needsAttention ? "destructive" : "outline"}>
          {t(
            item.countReviewRequired
              ? "Count review required"
              : item.available <= item.reorderLevel
                ? "Low stock"
                : "In stock"
          )}
        </Badge>
      </div>
      <div
        role="img"
        aria-label={`${displayQuantity(item.available, item.unit)} ${t("Available")} · ${displayQuantity(item.reserved, item.unit)} ${t("Reserved")}`}
        className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="bg-secondary"
          style={{ width: `${availablePercent}%` }}
        />
        <span className="bg-primary" style={{ width: `${reservedPercent}%` }} />
      </div>
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { kind: "RECEIPT", label: "Receive" },
              { kind: "WASTE", label: "Waste" },
              { kind: "COUNT", label: "Count" },
            ] as const
          ).map((action) => (
            <Button
              key={action.kind}
              variant="outline"
              size="sm"
              aria-label={`${t(action.label)} ${item.name}`}
              onClick={() => onAction(action.kind)}
            >
              {t(action.label)}
            </Button>
          ))}
        </div>
      )}
    </article>
  )
}
