import { CheckIcon } from "@phosphor-icons/react"

export const CATEGORY_COLORS = [
  "#E7EED8",
  "#F5DFC5",
  "#F2DADD",
  "#DCEAF2",
  "#E5DFF3",
  "#D7EBE3",
]

export function categoryColor(color?: string | null) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : CATEGORY_COLORS[0]
}

export function CategoryCard({
  name,
  color,
  count,
  active = false,
  onClick,
  fullWidth = false,
}: {
  name: string
  color?: string | null
  count?: number
  active?: boolean
  onClick?: () => void
  fullWidth?: boolean
}) {
  const background = categoryColor(color)
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(background.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  const foreground = luminance > 0.179 ? "#000000" : "#FFFFFF"

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{ backgroundColor: background, color: foreground }}
      className={`relative flex min-h-28 ${fullWidth ? "w-full" : "w-40"} shrink-0 flex-col justify-between overflow-hidden rounded-lg p-4 text-left outline-offset-4 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring ${active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -right-12 h-44 w-36 opacity-[0.08]"
        viewBox="0 0 140 180"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
      >
        {[0, 1, 2, 3].map((index) => (
          <ellipse
            key={index}
            cx="70"
            cy="90"
            rx={20 + index * 15}
            ry={38 + index * 18}
            transform="rotate(30 70 90)"
          />
        ))}
      </svg>
      <span className="relative flex w-full items-start justify-between gap-2">
        <span className="text-base leading-snug font-semibold break-words">
          {name}
        </span>
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-full"
          style={
            active
              ? { backgroundColor: foreground, color: background }
              : undefined
          }
        >
          {active && (
            <CheckIcon aria-hidden="true" weight="bold" className="size-3" />
          )}
        </span>
      </span>
      {count !== undefined && (
        <span className="relative mt-3 text-xs tabular-nums">
          {count} {count === 1 ? "item" : "items"}
        </span>
      )}
    </button>
  )
}
