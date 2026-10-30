import type { ReactNode } from "react"
import { useMediaQuery } from "@/lib/use-media-query"
import { MobileTableFilters } from "./mobile-table-toolbar"

export function MobileFeatureFilters({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const compact = useMediaQuery("(max-width: 1023px)")
  return compact ? (
    <MobileTableFilters label={label}>{children}</MobileTableFilters>
  ) : (
    children
  )
}
