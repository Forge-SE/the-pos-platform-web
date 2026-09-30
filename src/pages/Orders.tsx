import type { ReactNode } from "react"
import { CookingPotIcon, ReceiptIcon } from "@phosphor-icons/react"

import { CashierDesk } from "@/features/orders/cashier-desk"
import { KitchenDisplay } from "@/features/orders/kitchen-display"
import { OwnerOrders } from "@/features/orders/owner-orders"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { useUrlState } from "@/lib/url-state"

export function Orders() {
  const role = getAccessTokenProfile()?.role
  if (role === "CASHIER") return <CashierOrders />
  if (role === "OWNER") return <OwnerOrders />
  if (role === "MANAGER") return <ManagerOrders />
  if (role === "KITCHEN") return <KitchenDisplay />
  return <OwnerOrders />
}

function CashierOrders() {
  const [desk, setDesk] = useUrlState("desk")
  const status = desk === "status"
  const switcher = (
    <div
      className="grid shrink-0 grid-cols-3 rounded-xl bg-secondary p-1"
      role="group"
      aria-label="Order page"
    >
      <DeskButton
        active={!status && desk !== "history"}
        onClick={() => setDesk(null)}
        icon={<ReceiptIcon aria-hidden="true" />}
      >
        Take orders
      </DeskButton>
      <DeskButton
        active={status}
        onClick={() => setDesk("status")}
        icon={<CookingPotIcon aria-hidden="true" />}
      >
        Order status
      </DeskButton>
      <DeskButton
        active={desk === "history"}
        onClick={() => setDesk("history")}
        icon={<ReceiptIcon aria-hidden="true" />}
      >
        History
      </DeskButton>
    </div>
  )
  if (desk === "history") return <OwnerOrders switcher={switcher} />
  if (status) return <KitchenDisplay readOnly switcher={switcher} />
  return <CashierDesk switcher={switcher} />
}

function ManagerOrders() {
  const [desk, setDesk] = useUrlState("desk")
  const history = desk === "history"
  const switcher = (
    <div
      className="grid grid-cols-2 rounded-xl bg-secondary p-1"
      role="group"
      aria-label="Order page"
    >
      <DeskButton
        active={!history}
        onClick={() => setDesk(null)}
        icon={<CookingPotIcon aria-hidden="true" />}
      >
        Kitchen
      </DeskButton>
      <DeskButton
        active={history}
        onClick={() => setDesk("history")}
        icon={<ReceiptIcon aria-hidden="true" />}
      >
        History
      </DeskButton>
    </div>
  )
  return history ? (
    <OwnerOrders switcher={switcher} />
  ) : (
    <KitchenDisplay switcher={switcher} />
  )
}

function DeskButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-secondary-foreground/80 transition-[background-color,color] focus-visible:ring-3 focus-visible:ring-ring/40 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
    >
      <span className="[&>svg]:size-3.5">{icon}</span>
      {children}
    </button>
  )
}
