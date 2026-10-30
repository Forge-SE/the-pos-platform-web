import { Popover } from "@base-ui/react/popover"
import { InfoIcon } from "@phosphor-icons/react"

export function InfoTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={label}
        className="mobile-info-trigger inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <InfoIcon aria-hidden="true" className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="center"
          sideOffset={8}
          className="z-[90] outline-none"
        >
          <Popover.Popup className="max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs leading-5 text-popover-foreground shadow-lg">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
