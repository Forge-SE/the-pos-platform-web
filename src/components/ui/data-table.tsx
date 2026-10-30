import { useMediaQuery } from "@/lib/use-media-query"
import { MobileTableContent } from "@/components/mobile/mobile-table-content"
import type { MobileFieldRole } from "@/components/mobile/mobile-table-content"
import { MobileTableFilters } from "@/components/mobile/mobile-table-toolbar"
import { useId, useState } from "react"
import type { ComponentProps, ReactNode } from "react"
import {
  ArrowClockwiseIcon,
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
  TableIcon,
} from "@phosphor-icons/react"
import { cn } from "cn"
import { useLanguage } from "@/components/language-provider"
import { Button } from "./button"
import { Input } from "./input"
import { Skeleton } from "./skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

export interface DataTableColumn<TRow> {
  id: string
  header: ReactNode
  cell: (row: TRow) => ReactNode
  className?: string
  mobileRole?: MobileFieldRole
}

export type DataTableView = "table" | "grid"
export type DataTableLayout<TRow> =
  | { mode: "table" }
  | { mode: "grid"; renderCard: (row: TRow) => ReactNode }
  | ({ mode: "toggle"; renderCard: (row: TRow) => ReactNode } & (
      | {
          view: DataTableView
          onViewChange: (view: DataTableView) => void
          defaultView?: never
        }
      | {
          view?: never
          defaultView?: DataTableView
          onViewChange?: (view: DataTableView) => void
        }
    ))

export interface DataTablePagination {
  pageIndex: number
  pageSize: number
  totalCount?: number
  hasNextPage?: boolean
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: readonly number[]
}

export interface DataTableProps<TRow> {
  rows?: TRow[]
  columns?: DataTableColumn<TRow>[]
  getRowId?: (row: TRow) => string
  ariaLabel: string
  children?: ReactNode
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
  }
  filters?: ReactNode
  onRefresh?: () => void
  pagination?: DataTablePagination
  isLoading?: boolean
  isFetching?: boolean
  emptyState?: ReactNode
  errorState?: ReactNode
  className?: string
  layout?: DataTableLayout<TRow>
  gridClassName?: string
  getRowProps?: (row: TRow) => ComponentProps<"tr">
  mobilePresentation?: "records" | "scroll"
  mobileFieldRoles?: readonly MobileFieldRole[]
}

export function DataTable<TRow>({
  rows = [],
  columns = [],
  getRowId = () => "",
  ariaLabel,
  children,
  search,
  filters,
  onRefresh,
  pagination,
  isLoading = false,
  isFetching = false,
  emptyState = "No results found.",
  errorState,
  className,
  layout = { mode: "table" },
  gridClassName = "grid-cols-1 gap-4 @xl/data-table:grid-cols-2 @4xl/data-table:grid-cols-3 @6xl/data-table:grid-cols-4",
  getRowProps,
  mobilePresentation = "records",
  mobileFieldRoles,
}: DataTableProps<TRow>) {
  const { t, language } = useLanguage()
  const compact = useMediaQuery("(max-width: 1023px)")
  const mobileRecords = compact && mobilePresentation === "records"
  const id = useId()
  const [localView, setLocalView] = useState<DataTableView>(
    layout.mode === "toggle" ? (layout.defaultView ?? "table") : "table"
  )
  const view =
    layout.mode === "grid"
      ? "grid"
      : layout.mode === "toggle"
        ? (layout.view ?? localView)
        : "table"
  const changeView = (next: DataTableView) => {
    if (layout.mode !== "toggle") return
    if (layout.view === undefined) setLocalView(next)
    layout.onViewChange?.(next)
  }
  const hasError = errorState != null && errorState !== false
  const pageIndex = pagination?.pageIndex ?? 0
  const pageSize = pagination?.pageSize ?? Math.max(rows.length, 1)
  const totalCount = pagination?.totalCount ?? rows.length
  const lastPage = Math.max(0, Math.ceil(totalCount / pageSize) - 1)
  const start = rows.length === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min(pageIndex * pageSize + rows.length, totalCount)
  const pageSizes = pagination
    ? Array.from(
        new Set([
          ...(pagination.pageSizeOptions ?? [10, 20, 50, 100]),
          pageSize,
        ])
      )
    : []
  const unavailable = hasError || isLoading
  const disabled =
    unavailable ||
    isFetching ||
    (totalCount === 0 && pageIndex === 0 && !pagination?.hasNextPage)
  const navigation = [
    ["First page", CaretDoubleLeftIcon, 0, pageIndex <= 0],
    ["Previous page", CaretLeftIcon, pageIndex - 1, pageIndex <= 0],
    [
      "Next page",
      CaretRightIcon,
      pageIndex + 1,
      pagination?.hasNextPage === undefined
        ? pageIndex >= lastPage
        : !pagination.hasNextPage,
    ],
    [
      "Last page",
      CaretDoubleRightIcon,
      lastPage,
      pagination?.totalCount === undefined || pageIndex >= lastPage,
    ],
  ] as const
  const showToolbar = Boolean(
    search || filters || onRefresh || (!children && layout.mode === "toggle")
  )

  return (
    <div
      data-slot="data-table"
      className={cn(
        "@container/data-table flex min-h-0 w-full min-w-0 flex-1 flex-col text-sm text-foreground",
        compact && "mobile-data-table",
        className
      )}
    >
      {showToolbar && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-4">
          {search && (
            <div className="relative w-full sm:w-72">
              <label htmlFor={`${id}-search`} className="sr-only">
                {t(search.label ?? "Search")}
              </label>
              <MagnifyingGlassIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={`${id}-search`}
                type="search"
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={t(search.placeholder ?? "Search…")}
                className="pl-9"
              />
            </div>
          )}
          <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
            {compact && filters ? (
              <MobileTableFilters label={ariaLabel}>
                {filters}
              </MobileTableFilters>
            ) : (
              filters
            )}
            {!children && layout.mode === "toggle" && (
              <div
                role="group"
                aria-label={`${ariaLabel} layout`}
                className="flex items-center gap-1 rounded-md border border-border p-1"
              >
                {(
                  [
                    ["table", TableIcon, "Table view"],
                    ["grid", SquaresFourIcon, "Grid view"],
                  ] as const
                ).map(([value, Icon, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={view === value ? "secondary" : "ghost"}
                    size="icon-sm"
                    aria-label={t(label)}
                    aria-pressed={view === value}
                    title={t(label)}
                    onClick={() => changeView(value)}
                  >
                    <Icon aria-hidden />
                  </Button>
                ))}
              </div>
            )}
            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Refresh ${t(ariaLabel)}`}
                title={`Refresh ${t(ariaLabel)}`}
                disabled={isLoading || isFetching}
                onClick={onRefresh}
              >
                <ArrowClockwiseIcon aria-hidden />
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        role="region"
        aria-label={`${ariaLabel} ${view} scroll area`}
        tabIndex={0}
        className="min-h-0 min-w-0 flex-1 [scrollbar-width:none] overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring/25 [&::-webkit-scrollbar]:hidden"
      >
        {children ? (
          <table
            role={compact ? "table" : undefined}
            className={`w-full min-w-max border-separate border-spacing-0 text-left ${mobileRecords ? "mobile-record-table" : ""}`}
          >
            <caption className="sr-only">{ariaLabel}</caption>
            {mobileRecords ? (
              <MobileTableContent fieldRoles={mobileFieldRoles}>
                {children}
              </MobileTableContent>
            ) : (
              children
            )}
          </table>
        ) : view === "grid" && layout.mode !== "table" ? (
          hasError ? (
            <div className="flex min-h-64 items-center justify-center px-4 py-12 text-center text-muted-foreground">
              {errorState}
            </div>
          ) : isLoading ? (
            <div role="status">
              <span className="sr-only">
                {t("Loading")} {t(ariaLabel)}
              </span>
              <ul aria-hidden className={cn("grid", gridClassName)}>
                {Array.from({ length: Math.min(pageSize, 6) }, (_, index) => (
                  <li
                    key={index}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <Skeleton className="aspect-video w-full rounded-none" />
                    <div className="space-y-3 p-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : rows.length === 0 ? (
            <div
              role="status"
              className="px-4 py-12 text-center text-muted-foreground"
            >
              {typeof emptyState === "string" ? t(emptyState) : emptyState}
            </div>
          ) : (
            <ul
              aria-label={ariaLabel}
              aria-busy={isFetching}
              className={cn("grid pb-1", gridClassName)}
            >
              {rows.map((row) => (
                <li key={getRowId(row)} className="min-w-0">
                  {layout.renderCard(row)}
                </li>
              ))}
            </ul>
          )
        ) : (
          <table
            role={compact ? "table" : undefined}
            className={cn(
              "w-full min-w-max border-separate border-spacing-0 text-left",
              mobileRecords && "mobile-record-table",
              (hasError || (!isLoading && rows.length === 0)) && "h-full"
            )}
            aria-busy={!hasError && (isLoading || isFetching)}
          >
            <caption className="sr-only">{ariaLabel}</caption>
            <TablePresentation compact={mobileRecords}>
              <thead className="sticky top-0 z-10 h-9 text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      scope="col"
                      className={cn(
                        "bg-muted px-3 py-2 font-medium whitespace-nowrap first:rounded-l-sm last:rounded-r-sm",
                        column.className
                      )}
                    >
                      {typeof column.header === "string"
                        ? t(column.header)
                        : column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!hasError && isLoading ? (
                  Array.from({ length: Math.min(pageSize, 6) }, (_, index) => (
                    <tr key={index} className="even:bg-muted/60">
                      {columns.map((column, columnIndex) => (
                        <td
                          key={column.id}
                          className={cn("px-3 py-3.5", column.className)}
                        >
                          {index === 0 && columnIndex === 0 && (
                            <span role="status" className="sr-only">
                              {t("Loading")} {t(ariaLabel)}
                            </span>
                          )}
                          <Skeleton aria-hidden className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : hasError || rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center align-middle text-muted-foreground"
                    >
                      <div
                        role={hasError ? undefined : "status"}
                        className="flex w-full items-center justify-center"
                      >
                        {hasError
                          ? errorState
                          : typeof emptyState === "string"
                            ? t(emptyState)
                            : emptyState}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const rowProps = getRowProps?.(row)
                    return (
                      <tr
                        {...rowProps}
                        key={getRowId(row)}
                        className={cn(
                          "even:bg-muted/60 hover:bg-muted/80",
                          rowProps?.className
                        )}
                      >
                        {columns.map((column) => (
                          <td
                            key={column.id}
                            data-mobile-field={column.mobileRole}
                            className={cn(
                              "px-3 py-2.5 whitespace-nowrap",
                              column.className
                            )}
                          >
                            {column.cell(row)}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </TablePresentation>
          </table>
        )}
      </div>

      {pagination && (
        <footer className="sticky bottom-0 z-10 grid w-full shrink-0 grid-cols-2 items-center gap-3 border-t border-border/60 bg-card px-4 py-4 @4xl/data-table:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <p
            aria-live="polite"
            className="col-start-1 row-start-1 min-w-0 text-sm text-muted-foreground"
          >
            {hasError
              ? t("Unable to load results")
              : isLoading
                ? t("Loading results…")
                : pagination.totalCount === undefined
                  ? language === "fr"
                    ? `Page ${pageIndex + 1} · ${rows.length} résultats`
                    : `Page ${pageIndex + 1} · ${rows.length} results`
                  : language === "fr"
                    ? `Affichage de ${start} à ${rows.length === 0 ? 0 : end} sur ${totalCount}`
                    : `Showing ${start} to ${rows.length === 0 ? 0 : end} out of ${totalCount}`}
          </p>
          <nav
            aria-label={`${ariaLabel} pagination`}
            className="col-span-2 row-start-2 grid w-full max-w-md grid-cols-4 gap-2 justify-self-center @4xl/data-table:col-span-1 @4xl/data-table:col-start-2 @4xl/data-table:row-start-1 @4xl/data-table:w-[28rem]"
          >
            {navigation.map(([label, Icon, page, boundary]) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                className="h-8 w-full gap-1 px-2 shadow-none disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground"
                aria-label={t(label)}
                title={t(label)}
                disabled={disabled || boundary}
                onClick={() => pagination.onPageChange(page)}
              >
                {label !== "Next page" && <Icon aria-hidden />}
                {label === "Previous page" && (
                  <span className="hidden @sm/data-table:inline">
                    {t("Previous")}
                  </span>
                )}
                {label === "Next page" && (
                  <>
                    <span className="hidden @sm/data-table:inline">
                      {t("Next")}
                    </span>
                    <Icon aria-hidden />
                  </>
                )}
              </Button>
            ))}
          </nav>
          <div className="col-start-2 row-start-1 justify-self-end @4xl/data-table:col-start-3">
            <label htmlFor={`${id}-page-size`} className="sr-only">
              {t("Rows per page")}
            </label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) =>
                pagination.onPageSizeChange(Number(value ?? pageSize))
              }
            >
              <SelectTrigger
                id={`${id}-page-size`}
                size="sm"
                className="min-w-24 px-2"
                disabled={unavailable || isFetching}
              >
                <SelectValue>{pageSize} / page</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </footer>
      )}
    </div>
  )
}

function TablePresentation({
  compact,
  children,
}: {
  compact: boolean
  children: ReactNode
}) {
  return compact ? (
    <MobileTableContent>{children}</MobileTableContent>
  ) : (
    children
  )
}
