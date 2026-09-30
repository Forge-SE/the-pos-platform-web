import type { ReactNode } from "react"
import { Toast } from "@base-ui/react/toast"
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react"

const toastManager = Toast.createToastManager()

type ToastMessage = {
  title: string
  description?: string
  status?: "success" | "error" | "information"
}

export function toast({ status = "information", ...message }: ToastMessage) {
  return toastManager.add({
    ...message,
    type: status,
    priority: status === "error" ? "high" : "low",
    timeout: status === "error" ? 8000 : 5000,
  })
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} limit={3}>
      {children}
      <ToastList />
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return (
    <Toast.Portal>
      <Toast.Viewport className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none">
        {toasts.map((item) => {
          const Icon =
            item.type === "success"
              ? CheckCircleIcon
              : item.type === "error"
                ? WarningCircleIcon
                : InfoIcon
          return (
            <Toast.Root
              key={item.id}
              toast={item}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-xl transition-[transform,opacity] duration-200 data-ending-style:translate-y-5 data-ending-style:opacity-0 data-limited:hidden data-starting-style:translate-y-5 data-starting-style:opacity-0 motion-reduce:transition-none"
            >
              <Icon
                aria-hidden="true"
                weight="fill"
                className={`mt-0.5 size-5 shrink-0 ${item.type === "success" ? "text-emerald-600 dark:text-emerald-400" : item.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
              />
              <Toast.Content className="min-w-0 flex-1 pt-0.5">
                <Toast.Title className="text-sm font-medium" />
                <Toast.Description className="mt-0.5 text-sm text-muted-foreground empty:hidden" />
              </Toast.Content>
              <Toast.Close
                aria-label="Dismiss notification"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <XIcon aria-hidden="true" className="size-4" />
              </Toast.Close>
            </Toast.Root>
          )
        })}
      </Toast.Viewport>
    </Toast.Portal>
  )
}
