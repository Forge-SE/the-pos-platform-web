import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import {
  ClockIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { diningLabel, type DiningType } from "@/features/orders/labels"
import {
  cedisToPesewas,
  formatMoney,
  mutationMessage,
} from "@/features/menu/model"
import { normalizeGhanaPhone } from "@/features/payouts/phone"

interface ModifierOption {
  id: string
  name: string
  priceDelta: number
  active: boolean
  imageUrl?: string | null
}

interface ModifierGroup {
  id: string
  name: string
  minSelections: number
  maxSelections: number
  options: ModifierOption[]
}

interface CounterItem {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  modifierGroups: ModifierGroup[]
}

interface CounterMenu {
  menuCategories: Array<{ id: string; name: string; sortOrder: number }>
  menuItems: CounterItem[]
}

interface BagLine {
  key: string
  item: CounterItem
  quantity: number
  optionIds: string[]
  summary: string
  notes: string
  unitPrice: number
}

const MENU_QUERY = gql`
  query CounterMenu {
    menuCategories {
      id
      name
      sortOrder
    }
    menuItems {
      id
      categoryId
      name
      description
      price
      imageUrl
      modifierGroups {
        id
        name
        minSelections
        maxSelections
        options {
          id
          name
          priceDelta
          active
          imageUrl
        }
      }
    }
  }
`

const SHIFT_QUERY = gql`
  query CounterShift {
    currentShift {
      id
    }
  }
`

const CREATE_ORDER = gql`
  mutation CreateCounterOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      total
    }
  }
`

const RECORD_PAYMENT = gql`
  mutation RecordCounterPayment($input: RecordPaymentInput!) {
    recordPayment(input: $input) {
      id
    }
  }
`

const INITIATE_MOMO = gql`
  mutation InitiateCounterMomo($input: InitiateMomoPaymentInput!) {
    initiateMomoPayment(input: $input) {
      status
      displayText
      failureReason
    }
  }
`

const tipPresets = [
  { id: "none", label: "None", amount: 0 },
  { id: "2", label: "GH₵2", amount: 200 },
  { id: "5", label: "GH₵5", amount: 500 },
  { id: "10", label: "GH₵10", amount: 1000 },
] as const

const networks = [
  { id: "MTN" as const, label: "MTN" },
  { id: "VODAFONE" as const, label: "Telecel" },
  { id: "AIRTELTIGO" as const, label: "AT" },
]

function lineKey(itemId: string, optionIds: string[], notes: string) {
  return `${itemId}:${[...optionIds].sort().join(",")}:${notes.trim()}`
}

function optionPrice(item: CounterItem, optionIds: string[]) {
  const options = item.modifierGroups.flatMap((group) => group.options)
  return optionIds.reduce((sum, id) => {
    const option = options.find((candidate) => candidate.id === id)
    return sum + (option?.priceDelta ?? 0)
  }, 0)
}

function optionSummary(item: CounterItem, optionIds: string[]) {
  const options = item.modifierGroups.flatMap((group) => group.options)
  return optionIds
    .map((id) => options.find((option) => option.id === id)?.name)
    .filter(Boolean)
    .join(" · ")
}

function groupMode(group: ModifierGroup): "radio" | "cards" | "chips" {
  if (group.maxSelections <= 1) return "radio"
  const priced = group.options.some((option) => option.priceDelta !== 0)
  return priced ? "cards" : "chips"
}

export function CashierDesk({ switcher }: { switcher?: ReactNode } = {}) {
  const { data, loading, error } = useQuery<CounterMenu>(MENU_QUERY)
  const { data: shiftData } = useQuery<{
    currentShift: { id: string } | null
  }>(SHIFT_QUERY)
  const [createOrder, { loading: creating }] = useMutation(CREATE_ORDER)
  const [recordPayment, { loading: recording }] = useMutation(RECORD_PAYMENT)
  const [initiateMomo, { loading: charging }] = useMutation(INITIATE_MOMO)

  const [categoryId, setCategoryId] = useState("all")
  const [search, setSearch] = useState("")
  const [customizing, setCustomizing] = useState<CounterItem | null>(null)
  const [bagOpen, setBagOpen] = useState(false)
  const [lines, setLines] = useState<BagLine[]>([])
  const [diningType, setDiningType] = useState<DiningType>("TAKEAWAY")
  const [tipChoice, setTipChoice] = useState("none")
  const [customTip, setCustomTip] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [payMethod, setPayMethod] = useState<"CASH" | "MOMO">("MOMO")
  const [network, setNetwork] = useState<(typeof networks)[number]["id"]>("MTN")
  const [walletPhone, setWalletPhone] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const categories = data?.menuCategories ?? []
  const items = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (data?.menuItems ?? []).filter((item) => {
      const inCategory = categoryId === "all" || item.categoryId === categoryId
      const matches =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.description ?? "").toLowerCase().includes(query)
      return inCategory && matches
    })
  }, [categoryId, data?.menuItems, search])

  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  )
  const tip =
    tipChoice === "percent"
      ? Math.round(subtotal * 0.1)
      : tipChoice === "custom"
        ? (cedisToPesewas(customTip) ?? 0)
        : (tipPresets.find((preset) => preset.id === tipChoice)?.amount ?? 0)
  const due = subtotal + Math.max(tip, 0)
  const shiftId = shiftData?.currentShift?.id ?? null
  const busy = creating || recording || charging

  function addLine(item: CounterItem, optionIds: string[], notes: string) {
    const kitchenNotes = notes.trim()
    const key = lineKey(item.id, optionIds, kitchenNotes)
    setLines((current) => {
      const existing = current.find((line) => line.key === key)
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [
        ...current,
        {
          key,
          item,
          quantity: 1,
          optionIds,
          summary: optionSummary(item, optionIds),
          notes: kitchenNotes,
          unitPrice: item.price + optionPrice(item, optionIds),
        },
      ]
    })
    setCustomizing(null)
    setBagOpen(true)
  }

  function setQuantity(key: string, quantity: number) {
    setLines((current) =>
      quantity < 1
        ? current.filter((line) => line.key !== key)
        : current.map((line) =>
            line.key === key ? { ...line, quantity } : line
          )
    )
  }

  async function placeOrder() {
    setFormError(null)
    setNotice(null)
    if (!shiftId) {
      setFormError("Open a shift before taking orders.")
      return
    }
    if (!lines.length) {
      setFormError("Add a dish to the bag first.")
      return
    }
    if (tipChoice === "custom" && cedisToPesewas(customTip) === null) {
      setFormError("Enter the tip in cedis, like 1.50.")
      return
    }
    const guestPhone = contactPhone.trim()
      ? normalizeGhanaPhone(contactPhone)
      : null
    if (contactPhone.trim() && !guestPhone) {
      setFormError("Enter a Ghana phone number, like 024 123 4567.")
      return
    }
    const wallet =
      payMethod === "MOMO"
        ? normalizeGhanaPhone(walletPhone || contactPhone)
        : null
    if (payMethod === "MOMO" && !wallet) {
      setFormError(
        "Enter the MoMo wallet number that should receive the prompt."
      )
      return
    }
    const notes =
      [customerName.trim(), guestPhone].filter(Boolean).join(" · ") || null
    try {
      const created = await createOrder({
        variables: {
          input: {
            idempotencyKey: crypto.randomUUID(),
            shiftId,
            diningType,
            tip,
            notes,
            items: lines.map((line) => ({
              menuItemId: line.item.id,
              quantity: line.quantity,
              modifierOptionIds: line.optionIds,
              notes: line.notes || null,
            })),
          },
        },
      })
      const order = (
        created.data as
          { createOrder?: { id: string; total: number } } | undefined
      )?.createOrder
      if (!order) throw new Error("The order was not created.")
      if (payMethod === "CASH") {
        await recordPayment({
          variables: {
            input: {
              idempotencyKey: crypto.randomUUID(),
              orderId: order.id,
              method: "CASH",
              amount: order.total,
              receiptChannel: "PRINT",
            },
          },
        })
        setNotice(
          `Cash order ${order.id.slice(-6).toUpperCase()} is in. Total ${formatMoney(order.total)}.`
        )
      } else {
        const charged = await initiateMomo({
          variables: {
            input: {
              idempotencyKey: crypto.randomUUID(),
              orderId: order.id,
              phone: wallet,
              provider: network,
              receiptChannel: "SMS",
            },
          },
        })
        const attempt = (
          charged.data as {
            initiateMomoPayment?: {
              displayText?: string | null
              failureReason?: string | null
            }
          }
        )?.initiateMomoPayment
        setNotice(
          attempt?.displayText ||
            attempt?.failureReason ||
            `Prompt sent for order ${order.id.slice(-6).toUpperCase()}.`
        )
      }
      setLines([])
      setCustomerName("")
      setContactPhone("")
      setWalletPhone("")
      setTipChoice("none")
      setCustomTip("")
      setBagOpen(false)
    } catch (caught) {
      setFormError(mutationMessage(caught, "The order could not be placed."))
    }
  }

  return (
    <div className="flex max-h-[calc(100svh-4.5rem)] flex-col lg:max-h-[calc(100svh-1rem)]">
      <header className="flex flex-wrap items-center justify-between gap-4 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Counter
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build the bag, then take cash or send a MoMo prompt.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {switcher}
          <Button onClick={() => setBagOpen(true)} className="shrink-0">
            <ShoppingBagIcon aria-hidden="true" data-icon="inline-start" />
            Bag
            <span className="tabular-nums">
              {lines.reduce((sum, line) => sum + line.quantity, 0)}
            </span>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        {notice && (
          <p
            className="mb-4 rounded-xl border border-border/70 bg-primary/25 px-4 py-3 text-sm"
            role="status"
          >
            {notice}
          </p>
        )}
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the menu"
          aria-label="Search the menu"
          className="max-w-sm"
        />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <CategoryChip
            active={categoryId === "all"}
            onClick={() => setCategoryId("all")}
          >
            All
          </CategoryChip>
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              active={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </CategoryChip>
          ))}
        </div>

        {error ? (
          <p
            className="py-16 text-center text-sm text-destructive"
            role="alert"
          >
            The menu could not be loaded.
          </p>
        ) : loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No dishes match this counter.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const category = categories.find(
                (entry) => entry.id === item.categoryId
              )
              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-card"
                >
                  <div className="relative aspect-video bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="size-full object-cover outline outline-black/10"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-3xl font-semibold text-secondary/40">
                        {item.name.slice(0, 1)}
                      </div>
                    )}
                    {category && (
                      <span className="absolute top-3 left-3 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold">
                        {category.name}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <h2 className="text-base font-semibold tracking-[-0.02em]">
                      {item.name}
                    </h2>
                    {item.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {item.modifierGroups.some((group) =>
                      group.options.some((option) => option.active)
                    ) && (
                      <ul className="flex flex-wrap gap-1.5">
                        {item.modifierGroups.flatMap((group) =>
                          group.options
                            .filter((option) => option.active)
                            .map((option) => (
                              <li
                                key={option.id}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 px-2 py-1 text-xs"
                              >
                                {option.imageUrl ? (
                                  <img
                                    src={option.imageUrl}
                                    alt=""
                                    className="size-5 shrink-0 rounded-full object-cover"
                                  />
                                ) : null}
                                <span className="truncate">{option.name}</span>
                              </li>
                            ))
                        )}
                      </ul>
                    )}
                    <div className="flex items-end justify-between gap-3 pt-1">
                      <p>
                        <span className="block text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                          Base price
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoney(item.price)}
                        </span>
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomizing(item)}
                      >
                        <PlusIcon aria-hidden="true" data-icon="inline-start" />
                        Customize
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {customizing && (
        <CustomizeDialog
          item={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={(optionIds, notes) => addLine(customizing, optionIds, notes)}
        />
      )}

      <BagDrawer
        open={bagOpen}
        onOpenChange={setBagOpen}
        lines={lines}
        diningType={diningType}
        onDiningType={setDiningType}
        tipChoice={tipChoice}
        onTipChoice={setTipChoice}
        customTip={customTip}
        onCustomTip={setCustomTip}
        tip={Math.max(tip, 0)}
        subtotal={subtotal}
        due={due}
        customerName={customerName}
        onCustomerName={setCustomerName}
        contactPhone={contactPhone}
        onContactPhone={setContactPhone}
        payMethod={payMethod}
        onPayMethod={setPayMethod}
        network={network}
        onNetwork={setNetwork}
        walletPhone={walletPhone}
        onWalletPhone={setWalletPhone}
        onQuantity={setQuantity}
        onClear={() => setLines([])}
        onPlace={placeOrder}
        busy={busy}
        error={formError}
      />
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] motion-reduce:active:scale-100 ${active ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  )
}

function CustomizeDialog({
  item,
  onClose,
  onAdd,
}: {
  item: CounterItem
  onClose: () => void
  onAdd: (optionIds: string[], notes: string) => void
}) {
  const [kitchenNotes, setKitchenNotes] = useState("")
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    for (const group of item.modifierGroups) {
      if (
        group.minSelections >= 1 &&
        group.maxSelections <= 1 &&
        group.options[0]
      ) {
        initial[group.id] = [group.options[0].id]
      } else {
        initial[group.id] = []
      }
    }
    return initial
  })

  const optionIds = Object.values(selected).flat()
  const unit = item.price + optionPrice(item, optionIds)
  const missing = item.modifierGroups.find(
    (group) => (selected[group.id]?.length ?? 0) < group.minSelections
  )

  function toggle(group: ModifierGroup, optionId: string) {
    setSelected((current) => {
      const chosen = current[group.id] ?? []
      if (group.maxSelections <= 1)
        return { ...current, [group.id]: [optionId] }
      if (chosen.includes(optionId)) {
        return {
          ...current,
          [group.id]: chosen.filter((id) => id !== optionId),
        }
      }
      if (chosen.length >= group.maxSelections) return current
      return { ...current, [group.id]: [...chosen, optionId] }
    })
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(92svh,760px)] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg">
          <div className="relative h-36 shrink-0 bg-muted">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="size-full object-cover outline outline-black/10"
              />
            )}
            <Dialog.Close
              aria-label="Close"
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-card/95"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <Dialog.Title className="text-xl font-semibold tracking-[-0.03em]">
              {item.name}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              Base {formatMoney(item.price)}
            </Dialog.Description>
            <div className="mt-5 space-y-5">
              {item.modifierGroups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  This dish is served as listed.
                </p>
              )}
              {item.modifierGroups.map((group, index) => (
                <fieldset key={group.id}>
                  <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold tracking-[0.08em] uppercase">
                    <span>
                      {index + 1}. {group.name}
                    </span>
                    <span
                      className={
                        group.minSelections > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {group.minSelections > 0 ? "Required" : "Optional"}
                    </span>
                  </legend>
                  <GroupOptions
                    group={group}
                    selected={selected[group.id] ?? []}
                    onToggle={(optionId) => toggle(group, optionId)}
                  />
                </fieldset>
              ))}
              <label className="block">
                <span className="text-xs font-semibold tracking-[0.08em] uppercase">
                  Special kitchen notes
                </span>
                <textarea
                  value={kitchenNotes}
                  onChange={(event) => setKitchenNotes(event.target.value)}
                  placeholder="e.g. Extra hot shito on the side, cut chicken into smaller pieces..."
                  className="mt-2 min-h-20 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring"
                />
              </label>
            </div>
          </div>
          <div className="border-t border-border/70 p-4">
            <Button
              className="w-full"
              disabled={Boolean(missing)}
              onClick={() => onAdd(optionIds, kitchenNotes)}
            >
              Add to bag
              <span className="tabular-nums">{formatMoney(unit)}</span>
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function GroupOptions({
  group,
  selected,
  onToggle,
}: {
  group: ModifierGroup
  selected: string[]
  onToggle: (optionId: string) => void
}) {
  const mode = groupMode(group)
  if (mode === "chips") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {group.options.map((option) => {
          const on = selected.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] motion-reduce:active:scale-100 ${on ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card"}`}
            >
              {option.imageUrl && (
                <img
                  src={option.imageUrl}
                  alt=""
                  className="size-5 rounded-full object-cover"
                />
              )}
              {option.name}
            </button>
          )
        })}
      </div>
    )
  }
  if (mode === "cards") {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {group.options.map((option) => {
          const on = selected.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option.id)}
              className={`rounded-xl border px-3 py-3 text-left transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] motion-reduce:active:scale-100 ${on ? "border-secondary bg-primary/20" : "border-border bg-card"}`}
            >
              <span className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border text-[10px] ${on ? "border-secondary bg-secondary text-secondary-foreground" : "border-input"}`}
                >
                  {on ? "✓" : ""}
                </span>
                {option.imageUrl && (
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="size-8 rounded-md object-cover"
                  />
                )}
                {option.name}
              </span>
              <span className="mt-2 block pl-6 text-xs font-medium text-secondary">
                {option.priceDelta > 0
                  ? `+${formatMoney(option.priceDelta)}`
                  : "Included"}
              </span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="mt-3 grid gap-2">
      {group.options.map((option) => {
        const on = selected.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(option.id)}
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] motion-reduce:active:scale-100 ${on ? "border-secondary bg-primary/20" : "border-border bg-card"}`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`flex size-4 items-center justify-center rounded-full border ${on ? "border-secondary" : "border-input"}`}
              >
                {on && <span className="size-2 rounded-full bg-secondary" />}
              </span>
              {option.imageUrl && (
                <img
                  src={option.imageUrl}
                  alt=""
                  className="size-8 rounded-md object-cover"
                />
              )}
              {option.name}
            </span>
            <span
              className={`shrink-0 text-xs font-medium ${option.priceDelta > 0 ? "text-secondary" : "text-muted-foreground"}`}
            >
              {option.priceDelta > 0
                ? `+${formatMoney(option.priceDelta)}`
                : "Included"}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function BagDrawer(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lines: BagLine[]
  diningType: DiningType
  onDiningType: (value: DiningType) => void
  tipChoice: string
  onTipChoice: (value: string) => void
  customTip: string
  onCustomTip: (value: string) => void
  tip: number
  subtotal: number
  due: number
  customerName: string
  onCustomerName: (value: string) => void
  contactPhone: string
  onContactPhone: (value: string) => void
  payMethod: "CASH" | "MOMO"
  onPayMethod: (value: "CASH" | "MOMO") => void
  network: (typeof networks)[number]["id"]
  onNetwork: (value: (typeof networks)[number]["id"]) => void
  walletPhone: string
  onWalletPhone: (value: string) => void
  onQuantity: (key: string, quantity: number) => void
  onClear: () => void
  onPlace: () => void
  busy: boolean
  error: string | null
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/70 bg-card shadow-lg">
          <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-[-0.03em]">
                Your bag
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                {props.lines.length === 0
                  ? "Nothing here yet."
                  : `${props.lines.reduce((sum, line) => sum + line.quantity, 0)} items ready`}
              </Dialog.Description>
            </div>
            <div className="flex items-center gap-2">
              {props.lines.length > 0 && (
                <button
                  type="button"
                  onClick={props.onClear}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              )}
              <Dialog.Close
                aria-label="Close bag"
                className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
              >
                <XIcon aria-hidden="true" className="size-4" />
              </Dialog.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {props.lines.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Customize a dish to start the order.
              </p>
            ) : (
              <ul className="space-y-3">
                {props.lines.map((line) => (
                  <li
                    key={line.key}
                    className="rounded-xl border border-border/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {line.item.name}
                        </p>
                        {line.summary && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {line.summary}
                          </p>
                        )}
                        {line.notes && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {line.notes}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(line.unitPrice * line.quantity)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          props.onQuantity(line.key, line.quantity - 1)
                        }
                        className="flex size-8 items-center justify-center rounded-full border border-border"
                      >
                        {line.quantity === 1 ? (
                          <TrashIcon className="size-3.5" />
                        ) : (
                          <MinusIcon className="size-3.5" />
                        )}
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          props.onQuantity(line.key, line.quantity + 1)
                        }
                        className="flex size-8 items-center justify-center rounded-full border border-border"
                      >
                        <PlusIcon className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <section>
              <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Dining
              </h2>
              <div
                className="mt-2 grid grid-cols-3 gap-2"
                role="radiogroup"
                aria-label="Dining"
              >
                {(["TAKEAWAY", "DINE_IN", "DELIVERY"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={props.diningType === value}
                    onClick={() => props.onDiningType(value)}
                    className={`h-10 rounded-full text-sm font-medium transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] motion-reduce:active:scale-100 ${props.diningType === value ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {diningLabel(value)}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Kitchen tip</h2>
                <span className="text-sm font-semibold text-secondary tabular-nums">
                  +{formatMoney(props.tip)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tipPresets.map((preset) => (
                  <TipChip
                    key={preset.id}
                    active={props.tipChoice === preset.id}
                    onClick={() => props.onTipChoice(preset.id)}
                  >
                    {preset.label}
                  </TipChip>
                ))}
                <TipChip
                  active={props.tipChoice === "percent"}
                  onClick={() => props.onTipChoice("percent")}
                >
                  10%
                </TipChip>
              </div>
              <Input
                inputMode="decimal"
                value={props.customTip}
                onChange={(event) => {
                  props.onCustomTip(event.target.value)
                  props.onTipChoice("custom")
                }}
                placeholder="Custom GH₵"
                aria-label="Custom tip in cedis"
                className="mt-3"
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Customer and payment
              </h2>
              <Input
                value={props.customerName}
                onChange={(event) => props.onCustomerName(event.target.value)}
                placeholder="Full name"
                aria-label="Customer name"
              />
              <Input
                value={props.contactPhone}
                onChange={(event) => props.onContactPhone(event.target.value)}
                placeholder="Contact phone"
                aria-label="Contact phone"
                inputMode="tel"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={props.payMethod === "MOMO"}
                  onClick={() => props.onPayMethod("MOMO")}
                  className={`h-11 rounded-xl text-sm font-semibold ${props.payMethod === "MOMO" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  Mobile Money
                </button>
                <button
                  type="button"
                  aria-pressed={props.payMethod === "CASH"}
                  onClick={() => props.onPayMethod("CASH")}
                  className={`h-11 rounded-xl text-sm font-semibold ${props.payMethod === "CASH" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  Cash / counter
                </button>
              </div>
              {props.payMethod === "MOMO" && (
                <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    MoMo network
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {networks.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        aria-pressed={props.network === entry.id}
                        onClick={() => props.onNetwork(entry.id)}
                        className={`h-9 rounded-full text-sm font-medium ${props.network === entry.id ? "bg-primary text-primary-foreground" : "bg-card"}`}
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={props.walletPhone}
                    onChange={(event) =>
                      props.onWalletPhone(event.target.value)
                    }
                    placeholder="MoMo wallet number"
                    aria-label="MoMo wallet number"
                    inputMode="tel"
                  />
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <ClockIcon aria-hidden="true" className="size-3.5" />A
                    prompt is sent to confirm payment on the phone.
                  </p>
                </div>
              )}
            </section>
          </div>
          <div className="space-y-3 border-t border-border/70 px-4 py-4">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(props.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-secondary">
                <dt>Kitchen tip</dt>
                <dd className="tabular-nums">+{formatMoney(props.tip)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>Total due</dt>
                <dd className="tabular-nums">{formatMoney(props.due)}</dd>
              </div>
            </dl>
            {props.error && (
              <p className="text-sm text-destructive" role="alert">
                {props.error}
              </p>
            )}
            <Button
              className="h-12 w-full"
              disabled={props.busy || props.lines.length === 0}
              onClick={props.onPlace}
            >
              {props.busy ? "Placing order…" : "Place order"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function TipChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 rounded-full px-3 text-sm font-medium ${active ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
    >
      {children}
    </button>
  )
}
