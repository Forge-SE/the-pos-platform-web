import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

export function SettingsDialog({
  open,
  onOpenChange,
  label,
  items,
  section,
  onSectionChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  items: ReadonlyArray<{ id: string; label: string; icon: Icon }>
  section: string
  onSectionChange: (id: string) => void
  children: ReactNode
}) {
  const { t } = useLanguage()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[80] bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[80] flex h-[min(680px,calc(100dvh-2rem))] w-[min(980px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:flex-row">
          <SettingsNav
            label={label}
            items={items}
            section={section}
            onSectionChange={onSectionChange}
          />
          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 z-10 size-9"
                  aria-label={t("Close settings")}
                >
                  <XIcon aria-hidden />
                </Button>
              }
            />
            {children}
          </section>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SettingsNav({
  label,
  items,
  section,
  onSectionChange,
}: {
  label: string
  items: ReadonlyArray<{ id: string; label: string; icon: Icon }>
  section: string
  onSectionChange: (id: string) => void
}) {
  const { t } = useLanguage()
  return (
    <aside className="shrink-0 border-b border-border/70 p-3 sm:w-60 sm:border-r sm:border-b-0 sm:p-4">
      <p className="mb-3 px-3 pt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t(label)}
      </p>
      <nav
        aria-label={t(label)}
        className="flex gap-1 overflow-x-auto sm:flex-col"
      >
        {items.map((item) => {
          const active = section === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onSectionChange(item.id)}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-left text-sm outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
            >
              <item.icon
                aria-hidden
                className={`size-4 ${active ? "text-primary" : ""}`}
              />
              {t(item.label)}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export function SettingsHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  const { t } = useLanguage()
  return (
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-border/70 py-5 pr-14 pl-5 sm:pl-6">
      <div className="min-w-0">
        <Dialog.Title className="text-base font-semibold">
          {t(title)}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-sm leading-5 text-muted-foreground">
          {t(description)}
        </Dialog.Description>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SettingsBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">
      {children}
    </div>
  )
}

export function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  return (
    <div className="grid items-center gap-4 border-b border-dashed border-border/70 py-6 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <h3 className="text-sm font-medium">{t(title)}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t(description)}
        </p>
      </div>
      <div className="flex min-w-0 items-center">{children}</div>
    </div>
  )
}
