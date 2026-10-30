import { Children, cloneElement, isValidElement } from "react"
import type {
  ReactElement,
  ReactNode,
  HTMLAttributes,
  TdHTMLAttributes,
} from "react"

export type TableElement = ReactElement<
  HTMLAttributes<HTMLElement> &
    TdHTMLAttributes<HTMLTableCellElement> & {
      "data-mobile-field"?: MobileFieldRole
    }
>
export type MobileFieldRole =
  "identity" | "status" | "amount" | "meta" | "detail" | "actions"
export function tableNodes(children: ReactNode): TableElement[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return []
    if (typeof child.type === "symbol")
      return tableNodes((child.props as { children?: ReactNode }).children)
    return [child as TableElement]
  })
}
function text(value: ReactNode): string {
  return Children.toArray(value)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement(child)
          ? text((child.props as { children?: ReactNode }).children)
          : ""
    )
    .join("")
}

/** Preserve real table semantics, cell controls and row handlers; only adapt presentation. */
export function MobileTableContent({
  children,
  fieldRoles = [],
}: {
  children: ReactNode
  fieldRoles?: readonly MobileFieldRole[]
}) {
  const sections = tableNodes(children)
  const headers = sections
    .filter((section) => section.type === "thead")
    .flatMap((section) =>
      tableNodes(section.props.children).flatMap((row) =>
        tableNodes(row.props.children).map((cell) => text(cell.props.children))
      )
    )
  return sections.map((section) => {
    if (section.type !== "tbody") return section
    return cloneElement(
      section,
      { role: "rowgroup" },
      tableNodes(section.props.children).map((row) => {
        if (row.type !== "tr") return row
        const cells = tableNodes(row.props.children)
        const state = cells.length === 1 && (cells[0].props.colSpan ?? 1) > 1
        const designed =
          !state &&
          (fieldRoles.length > 0 ||
            cells.some((cell) => cell.props["data-mobile-field"] !== undefined))
        return cloneElement(
          row,
          {
            role: "row",
            tabIndex: row.props.onClick ? 0 : row.props.tabIndex,
            onKeyDown: (event) => {
              row.props.onKeyDown?.(event)
              if (
                !event.defaultPrevented &&
                event.key === "Enter" &&
                event.target === event.currentTarget &&
                row.props.onClick
              )
                event.currentTarget.click()
            },
            className: `${row.props.className ?? ""} ${state ? "mobile-table-state" : "mobile-table-record"} ${designed ? "mobile-table-designed" : ""}`,
          },
          cells.map((cell, index) =>
            cloneElement(
              cell,
              {
                role: "cell",
                "data-mobile-field": state
                  ? undefined
                  : (cell.props["data-mobile-field"] ??
                    fieldRoles.at(index) ??
                    (index === 0 ? "identity" : "detail")),
              },
              <>
                {!state && headers[index] && (
                  <span aria-hidden className="mobile-table-label">
                    {headers[index]}
                  </span>
                )}
                <div className="mobile-table-value">{cell.props.children}</div>
              </>
            )
          )
        )
      })
    )
  })
}
