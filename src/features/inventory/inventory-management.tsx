import { useRef, useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { Navigate } from "@tanstack/react-router"
import { Tabs } from "@base-ui/react/tabs"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/toaster"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { useLanguage } from "@/components/language-provider"
import { InfoTooltip } from "@/components/info-tooltip"
import { MenuDialog as InventoryDialog } from "@/features/menu/modals/menu-dialog"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"
import { useUrlState } from "@/lib/url-state"
import { useTablePagination } from "@/lib/table-state"
import {
  amount,
  displayQuantity,
  STOCK_QUERY,
  MEALS_QUERY,
  RECIPE_QUERY,
  HISTORY_QUERY,
  CREATE_STOCK,
  RECORD_STOCK,
  SAVE_RECIPE,
} from "./model"
import type { StockItem, Recipe, RecipeLine, Meal, Movement } from "./model"

function Choices({
  value,
  onChange,
  label,
  options,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "")}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue>
          {(selected) =>
            options.find((option) => option.value === selected)?.label ??
            "Choose…"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
const panel =
  "content-region overflow-hidden rounded-md border border-border/70 bg-card"
const cell = "px-4 py-3"
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Could not save. Try again."

export function InventoryManagement() {
  const { t } = useLanguage()
  const profile = getAccessTokenProfile()
  const canView = hasPermission(profile, "INVENTORY_VIEW")
  const canManage = hasPermission(profile, "INVENTORY_MANAGE")
  const [tabParam, setTab] = useUrlState("inventoryTab")
  const tab =
    tabParam === "recipes" || tabParam === "movements" ? tabParam : "stock"
  const [createOpen, setCreateOpen] = useState(false)
  const [action, setAction] = useState<{
    stock: StockItem
    kind: "RECEIPT" | "WASTE" | "COUNT"
  } | null>(null)
  const { data, loading, error, refetch } = useQuery<{
    inventoryItems: StockItem[]
  }>(STOCK_QUERY, { skip: !canView, pollInterval: 30000 })
  const items = data?.inventoryItems ?? []
  if (!canView) return <Navigate to="/overview" replace />
  return (
    <div className="content-page px-4 py-5 sm:px-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.025em]">
            {t("Inventory")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t(
              "Track what came in, what was used, and what remains. Orders reserve stock; preparation consumes it."
            )}
          </p>
        </div>
        {canManage && items.length > 0 && (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            {t("Add stock item")}
          </Button>
        )}
      </header>
      <Tabs.Root
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="mt-6 flex flex-1 flex-col lg:min-h-0"
      >
        <Tabs.List
          aria-label={t("Inventory sections")}
          className="mb-5 flex gap-6 overflow-x-auto border-b border-border/70"
        >
          {[
            { value: "stock", label: "Stock" },
            { value: "recipes", label: "Meal recipes" },
            { value: "movements", label: "Movement log" },
          ].map((entry) => (
            <Tabs.Tab
              key={entry.value}
              value={entry.value}
              className="shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-active:border-secondary data-active:text-foreground"
            >
              {t(entry.label)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {loading && !data ? (
          <LoadingState label="inventory" />
        ) : error ? (
          <ErrorState title="Couldn’t load inventory" onRetry={refetch} />
        ) : (
          <>
            <Tabs.Panel value="stock" className="flex flex-1 flex-col">
              {!items.length ? (
                <EmptyState
                  title="No stock items yet"
                  description="Start with ingredients, prepared portions, drinks or packaging. Record opening quantities as a receipt with a reference."
                  action={
                    canManage ? (
                      <Button size="lg" onClick={() => setCreateOpen(true)}>
                        Add stock item
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <section
                  aria-label="Stock levels"
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {items.map((item) => (
                    <StockCard
                      key={item.id}
                      item={item}
                      canManage={canManage}
                      onAction={(kind) => setAction({ stock: item, kind })}
                    />
                  ))}
                </section>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="recipes" className="flex flex-1 flex-col">
              <Recipes items={items} canManage={canManage} />
            </Tabs.Panel>
            <Tabs.Panel
              value="movements"
              className="flex flex-1 flex-col lg:min-h-0"
            >
              <MovementLog />
            </Tabs.Panel>
          </>
        )}
      </Tabs.Root>
      {createOpen && (
        <CreateStock
          onClose={() => setCreateOpen(false)}
          onSaved={async () => {
            setCreateOpen(false)
            await refetch()
          }}
        />
      )}
      {action && (
        <StockAction
          key={`${action.stock.id}:${action.kind}`}
          {...action}
          onClose={() => setAction(null)}
          onSaved={async () => {
            setAction(null)
            await refetch()
            setTab("movements")
          }}
        />
      )}
    </div>
  )
}

function StockCard({
  item,
  canManage,
  onAction,
}: {
  item: StockItem
  canManage: boolean
  onAction: (kind: "RECEIPT" | "WASTE" | "COUNT") => void
}) {
  const { t } = useLanguage()
  const total = Math.max(0, item.onHand)
  const availablePercent =
    total > 0 ? Math.min(100, Math.max(0, (item.available / total) * 100)) : 0
  const reservedPercent =
    total > 0 ? Math.min(100, Math.max(0, (item.reserved / total) * 100)) : 0
  const reorderDifference = item.available - item.reorderLevel
  const needsAttention =
    item.countReviewRequired || item.available <= item.reorderLevel

  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-[-0.015em]">
              {item.name}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("Stock balance")}
            </p>
          </div>
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

        <div className="mt-6">
          <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {t("Available now")}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-[-0.035em] tabular-nums">
            {displayQuantity(item.available, item.unit)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {t("of")} <span>{displayQuantity(item.onHand, item.unit)}</span>{" "}
            {t("on hand")}
          </p>
        </div>

        <div className="mt-5">
          <div
            role="img"
            aria-label={`${displayQuantity(item.available, item.unit)} available and ${displayQuantity(item.reserved, item.unit)} reserved out of ${displayQuantity(item.onHand, item.unit)} on hand`}
            className="flex h-3 overflow-hidden rounded-full bg-muted"
          >
            <span
              className="h-full bg-secondary"
              style={{ width: `${availablePercent}%` }}
            />
            <span
              className="h-full bg-primary"
              style={{ width: `${reservedPercent}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 tabular-nums">
              <span className="size-2 rounded-full bg-secondary" />
              {t("Available")}
            </span>
            <span className="inline-flex items-center gap-2 tabular-nums">
              <span className="size-2 rounded-full bg-primary" />
              {t("Reserved")} {displayQuantity(item.reserved, item.unit)}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-muted/50 px-3.5 py-3">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">{t("Reorder point")}</span>
            <span className="font-medium tabular-nums">
              {displayQuantity(item.reorderLevel, item.unit)}
            </span>
          </div>
          <p
            className={`mt-1.5 text-sm font-medium tabular-nums ${needsAttention ? "text-destructive" : "text-foreground"}`}
          >
            {item.countReviewRequired
              ? t("Physical count needs review")
              : reorderDifference >= 0
                ? `${displayQuantity(reorderDifference, item.unit)} ${t("above reorder point")}`
                : `${displayQuantity(Math.abs(reorderDifference), item.unit)} ${t("below reorder point")}`}
          </p>
        </div>
      </div>

      {canManage && (
        <div className="grid grid-cols-3 gap-2 border-t border-border/60 bg-muted/20 p-3">
          {(
            [
              { kind: "RECEIPT", label: "Receive" },
              { kind: "WASTE", label: "Waste" },
              { kind: "COUNT", label: "Count" },
            ] as const
          ).map((option) => (
            <Button
              key={option.kind}
              size="sm"
              variant="outline"
              aria-label={`${t(option.label)} ${item.name}`}
              onClick={() => onAction(option.kind)}
            >
              {t(option.label)}
            </Button>
          ))}
        </div>
      )}
    </article>
  )
}

function CreateStock({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState("")
  const [unit, setUnit] = useState("g")
  const [level, setLevel] = useState("0")
  const [error, setError] = useState<string | null>(null)
  const [create, { loading }] = useMutation(CREATE_STOCK)
  async function save() {
    const reorderLevel = amount(level)
    if (!name.trim() || reorderLevel === undefined) {
      setError(
        "Enter a name and a valid non-negative reorder quantity (up to three decimal places)."
      )
      return
    }
    try {
      setError(null)
      await create({
        variables: { input: { name: name.trim(), unit, reorderLevel } },
      })
      toast({ title: "Stock item added", status: "success" })
      await onSaved()
    } catch (err) {
      setError(message(err))
    }
  }
  return (
    <InventoryDialog
      open
      onOpenChange={(open) => {
        if (!open && !loading) onClose()
      }}
      title="Add stock item"
      description="Choose the base unit you will count and consume. Unit changes are not supported after creation."
      footer={
        <Button disabled={loading} onClick={() => void save()}>
          {loading ? "Saving…" : "Add stock item"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="stock-name">Stock item name</FieldLabel>
          <Input
            id="stock-name"
            value={name}
            maxLength={160}
            onChange={(event) => setName(event.target.value)}
            placeholder="Rice, chicken portions, takeaway containers…"
          />
        </Field>
        <Field>
          <FieldLabel>Base unit</FieldLabel>
          <Choices
            value={unit}
            onChange={setUnit}
            label="Base unit"
            options={[
              { value: "g", label: "Grams (g)" },
              { value: "ml", label: "Millilitres (ml)" },
              { value: "each", label: "Each / portions" },
            ]}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="stock-reorder">
            Reorder level ({unit})
          </FieldLabel>
          <Input
            id="stock-reorder"
            inputMode="decimal"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Starts at zero. Receive opening stock separately so its source and
          staff member are recorded.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </InventoryDialog>
  )
}
function StockAction({
  stock,
  kind,
  onClose,
  onSaved,
}: {
  stock: StockItem
  kind: "RECEIPT" | "WASTE" | "COUNT"
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [value, setValue] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [record, { loading }] = useMutation<{
    recordInventoryMovement: { kind: string }
  }>(RECORD_STOCK)
  const key = useRef(crypto.randomUUID())
  const pending = useRef<Record<string, unknown> | null>(null)
  const [locked, setLocked] = useState(false)
  const title =
    kind === "RECEIPT"
      ? "Receive stock"
      : kind === "WASTE"
        ? "Record waste"
        : "Count stock"
  async function save() {
    const qty = amount(value)
    if (
      !pending.current &&
      (qty === undefined ||
        (kind !== "COUNT" && qty === 0) ||
        reason.trim().length < 3)
    ) {
      setError(
        "Enter a valid quantity and a reason or reference of at least three characters."
      )
      return
    }
    pending.current ??= {
      stockItemId: stock.id,
      kind,
      quantity: qty,
      reason: reason.trim(),
      idempotencyKey: key.current,
      ...(kind === "COUNT" ? { expectedVersion: stock.version } : {}),
    }
    setLocked(true)
    try {
      setError(null)
      const result = await record({ variables: { input: pending.current } })
      toast({
        title:
          result.data?.recordInventoryMovement.kind === "COUNT_REVIEW"
            ? "Count recorded — reserved stock needs review"
            : "Stock movement recorded",
        status: "success",
      })
      await onSaved()
    } catch (err) {
      setError(
        `${message(err)}. Retry the same request, or check the movement log before starting a new entry.`
      )
    }
  }
  return (
    <InventoryDialog
      open
      onOpenChange={(open) => {
        if (!open && !loading) onClose()
      }}
      title={`${title} · ${stock.name}`}
      description={
        kind === "COUNT"
          ? "Enter your physical count before comparing with the expected balance. If stock moves, start a fresh count."
          : kind === "WASTE"
            ? "For stock not already consumed by an order. Cancelled prepared meals are recorded automatically; do not deduct their ingredients again."
            : "Every entry keeps the quantity, staff member, time and reference."
      }
      footer={
        <Button disabled={loading} onClick={() => void save()}>
          {loading ? "Saving…" : locked ? "Retry same request" : "Record"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="stock-quantity">
            {kind === "COUNT" ? "Physical count" : "Quantity"} ({stock.unit})
          </FieldLabel>
          <Input
            id="stock-quantity"
            inputMode="decimal"
            value={value}
            readOnly={locked}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="stock-reason">
            {kind === "RECEIPT"
              ? "Supplier / delivery / opening-stock reference"
              : "Reason or count note"}
          </FieldLabel>
          <Textarea
            id="stock-reason"
            value={reason}
            readOnly={locked}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        {kind === "COUNT" && (
          <p className="text-xs text-muted-foreground">
            Counts below reserved stock are recorded for review without changing
            the balance. Resolve the affected open orders, then perform a new
            count.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </InventoryDialog>
  )
}

function Recipes({
  items,
  canManage,
}: {
  items: StockItem[]
  canManage: boolean
}) {
  const [mealParam, setMeal] = useUrlState("recipeMeal")
  const [mealSearch, setMealSearch] = useState("")
  const { data, loading, error, refetch } = useQuery<{ menuItems: Meal[] }>(
    MEALS_QUERY
  )
  const meals = data?.menuItems ?? []
  const meal = meals.find((entry) => entry.id === mealParam)
  const filteredMeals = meals.filter((entry) =>
    entry.name
      .toLocaleLowerCase()
      .includes(mealSearch.trim().toLocaleLowerCase())
  )
  if (loading) return <LoadingState label="meals" />
  if (error) return <ErrorState title="Couldn’t load meals" onRetry={refetch} />
  if (!meals.length || !items.length)
    return (
      <EmptyState
        title="Add meals and stock items first"
        description="A recipe connects a meal to the ingredients or portions it uses."
      />
    )
  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
      <aside className={`${panel} lg:sticky lg:top-5`}>
        <div className="border-b border-border/60 px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Meals</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {meals.length}
            </span>
          </div>
          <Input
            className="mt-3 h-9"
            aria-label="Search meals"
            placeholder="Search meals"
            value={mealSearch}
            onChange={(event) => setMealSearch(event.target.value)}
          />
        </div>
        <nav
          aria-label="Meal recipes"
          className="max-h-72 overflow-y-auto p-2 lg:max-h-[calc(100vh-18rem)]"
        >
          {filteredMeals.length ? (
            filteredMeals.map((entry) => {
              const selected = entry.id === meal?.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-current={selected ? "page" : undefined}
                  onClick={() => setMeal(entry.id)}
                  className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none ${
                    selected
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate font-medium">{entry.name}</span>
                  <span
                    aria-hidden="true"
                    className={
                      selected
                        ? "text-secondary-foreground/70"
                        : "text-muted-foreground"
                    }
                  >
                    →
                  </span>
                </button>
              )
            })
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No meals match “{mealSearch}”.
            </p>
          )}
        </nav>
      </aside>
      {meal ? (
        <RecipeLoader
          key={meal.id}
          meal={meal}
          items={items}
          canManage={canManage}
        />
      ) : (
        <div className={panel}>
          <EmptyState
            title="Choose a meal"
            description="Select a meal to define the stock used by each serving."
          />
        </div>
      )}
    </div>
  )
}
function RecipeLoader({
  meal,
  items,
  canManage,
}: {
  meal: Meal
  items: StockItem[]
  canManage: boolean
}) {
  const { data, loading, error, refetch } = useQuery<{
    inventoryRecipe: Recipe | null
  }>(RECIPE_QUERY, {
    variables: { menuItemId: meal.id },
    fetchPolicy: "network-only",
  })
  if (loading) return <LoadingState label="recipe" />
  if (error)
    return <ErrorState title="Couldn’t load recipe" onRetry={refetch} />
  return (
    <RecipeEditor
      key={data?.inventoryRecipe?.id ?? "new"}
      meal={meal}
      items={items}
      canManage={canManage}
      recipe={data?.inventoryRecipe ?? null}
      onSaved={refetch}
    />
  )
}
function RecipeEditor({
  meal,
  items,
  canManage,
  recipe,
  onSaved,
}: {
  meal: Meal
  items: StockItem[]
  canManage: boolean
  recipe: Recipe | null
  onSaved: () => Promise<unknown>
}) {
  const [enabled, setEnabled] = useState(recipe?.enabled ?? true)
  const [rows, setRows] = useState<
    Array<Omit<RecipeLine, "quantity"> & { quantity: string }>
  >(
    (recipe?.lines ?? []).map((row) => ({
      ...row,
      quantity: String(row.quantity),
    }))
  )
  const [error, setError] = useState<string | null>(null)
  const [saveRecipe, { loading }] = useMutation(SAVE_RECIPE)
  const modifierOptions = meal.modifierGroups.flatMap((group) =>
    group.options.map((option) => ({
      value: option.id,
      label: `${group.name} · ${option.name}`,
    }))
  )
  async function save() {
    const lines = rows.map((row) => ({
      ...row,
      quantity: amount(row.quantity),
    }))
    if (
      enabled &&
      (!lines.length ||
        lines.some(
          (row) =>
            !row.stockItemId || row.quantity === undefined || row.quantity === 0
        ))
    ) {
      setError("Add at least one valid ingredient with a positive quantity.")
      return
    }
    try {
      setError(null)
      await saveRecipe({
        variables: {
          input: {
            menuItemId: meal.id,
            expectedVersion: recipe?.version ?? 0,
            enabled,
            idempotencyKey: crypto.randomUUID(),
            lines: enabled ? lines : [],
          },
        },
      })
      toast({
        title: "Recipe version saved — existing orders are unchanged",
        status: "success",
      })
      await onSaved()
    } catch (err) {
      setError(message(err))
    }
  }
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Recipe for
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
            {meal.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {recipe && (
            <Badge variant="secondary">Version {recipe.version}</Badge>
          )}
          <Badge variant={enabled ? "outline" : "secondary"}>
            {enabled ? "Tracked" : "Not tracked"}
          </Badge>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3.5">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              className="size-4 accent-secondary"
              type="checkbox"
              disabled={!canManage || loading}
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Track inventory for this meal
          </label>
          <InfoTooltip label="About inventory tracking">
            Track inventory for new orders of this meal. Existing orders keep
            their original inventory requirements.
          </InfoTooltip>
        </div>
        <fieldset disabled={!canManage || loading} className="mt-6 space-y-3">
          {enabled && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                  Ingredients
                  <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                    {rows.length}
                  </span>
                </h3>
                <InfoTooltip label="About recipe quantities">
                  Quantities per serving. Extra-choice rows apply only when that
                  choice is ordered.
                </InfoTooltip>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setRows((current) => [
                    ...current,
                    { stockItemId: "", modifierOptionId: null, quantity: "" },
                  ])
                }
              >
                <PlusIcon data-icon="inline-start" />
                Add ingredient
              </Button>
            </div>
          )}
          {enabled &&
            rows.map((row, index) => {
              const stock = items.find((item) => item.id === row.stockItemId)
              return (
                <div
                  key={index}
                  className="rounded-lg border border-border/60 bg-background p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">
                        Ingredient {index + 1}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ingredient ${index + 1}`}
                      onClick={() =>
                        setRows((current) =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Stock item
                      </p>
                      <Choices
                        value={row.stockItemId}
                        onChange={(value) =>
                          setRows((current) =>
                            current.map((entry, i) =>
                              i === index
                                ? { ...entry, stockItemId: value }
                                : entry
                            )
                          )
                        }
                        label={`Ingredient ${index + 1}`}
                        options={items.map((item) => ({
                          value: item.id,
                          label: item.name,
                        }))}
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Used when
                      </p>
                      <Choices
                        value={row.modifierOptionId ?? "BASE"}
                        onChange={(value) =>
                          setRows((current) =>
                            current.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    modifierOptionId:
                                      value === "BASE" ? null : value,
                                  }
                                : entry
                            )
                          )
                        }
                        label={`Applies to ${index + 1}`}
                        options={[
                          { value: "BASE", label: "Every serving" },
                          ...modifierOptions,
                        ]}
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Quantity per serving
                      </p>
                      <div className="relative">
                        <Input
                          className="pr-12 tabular-nums"
                          aria-label={`Quantity ${index + 1} (${stock?.unit ?? "base unit"})`}
                          inputMode="decimal"
                          placeholder="0"
                          value={row.quantity}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((entry, i) =>
                                i === index
                                  ? { ...entry, quantity: event.target.value }
                                  : entry
                              )
                            )
                          }
                        />
                        {stock && (
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {stock.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          {enabled && !rows.length && (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">No ingredients yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add the stock used to prepare one serving.
              </p>
            </div>
          )}
        </fieldset>
        {error && (
          <div role="alert" className="mt-4 space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void onSaved()}>
              Reload latest recipe
            </Button>
          </div>
        )}
      </div>
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Changes create a new version</span>
            <InfoTooltip label="About saving recipe versions">
              Saving creates a new version. No previous order or recipe is
              overwritten.
            </InfoTooltip>
          </div>
          <Button disabled={loading} onClick={() => void save()}>
            {loading ? "Saving…" : "Save recipe version"}
          </Button>
        </div>
      )}
    </section>
  )
}
function MovementLog() {
  const { t, locale } = useLanguage()
  const paging = useTablePagination("movements", 25)
  const { data, loading, error, refetch } = useQuery<{
    inventoryHistory: { items: Movement[]; total: number }
  }>(HISTORY_QUERY, {
    variables: {
      offset: paging.pageIndex * paging.pageSize,
      limit: paging.pageSize,
    },
    fetchPolicy: "network-only",
    pollInterval: 30000,
  })
  const entries = data?.inventoryHistory.items ?? []
  const total = data?.inventoryHistory.total ?? 0
  if (loading && !data) return <LoadingState label="stock movements" />
  if (error)
    return <ErrorState title="Couldn’t load movement log" onRetry={refetch} />
  if (!entries.length && total === 0)
    return (
      <EmptyState
        title="No stock movements yet"
        description="Receipts, order reservations, consumption, waste and count differences will appear here."
      />
    )
  return (
    <section className="content-region overflow-hidden rounded-md bg-card lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">{t("Movement history")}</h2>
        <InfoTooltip label="About movement history">
          Append-only history. Negative count variance is a discrepancy to
          investigate, not proof of theft. Cancellation waste is already
          included in consumption.
        </InfoTooltip>
      </div>
      <div className="overflow-x-auto lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <DataTable
          ariaLabel={t("Inventory movement history")}
          rows={entries}
          onRefresh={() => void refetch()}
          isLoading={loading}
          pagination={{ ...paging, totalCount: total }}
        >
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {[
                "When / who",
                "Stock / action",
                "Quantity",
                "On-hand change",
                "Reserved change",
                "Reference / explanation",
              ].map((label) => (
                <th scope="col" key={label} className={cell}>
                  {t(label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No movements on this page"
                    description="Choose an earlier page to continue reviewing history."
                  />
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t border-border/60 align-top"
              >
                <td className={cell}>
                  <span className="text-xs whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString(locale)}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.actorName ?? entry.actorId}
                  </p>
                </td>
                <td className={cell}>
                  <p className="font-medium">{entry.stockName}</p>
                  <Badge
                    className="mt-1"
                    variant={
                      entry.kind === "COUNT_REVIEW" ||
                      (entry.variance != null && entry.variance !== 0)
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {entry.kind.replaceAll("_", " ").toLowerCase()}
                  </Badge>
                </td>
                <td className={`${cell} whitespace-nowrap tabular-nums`}>
                  {displayQuantity(entry.quantity, entry.unit)}
                </td>
                <td className={`${cell} whitespace-nowrap tabular-nums`}>
                  {displayQuantity(entry.onHandDelta, entry.unit)}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Balance {displayQuantity(entry.balanceAfter, entry.unit)}
                  </p>
                </td>
                <td className={`${cell} whitespace-nowrap tabular-nums`}>
                  {displayQuantity(entry.reservedDelta, entry.unit)}
                </td>
                <td className={`${cell} min-w-56`}>
                  <p>{entry.reason}</p>
                  {entry.variance != null && (
                    <p className="mt-1 text-xs font-medium">
                      Count variance:{" "}
                      {displayQuantity(entry.variance, entry.unit)}
                    </p>
                  )}
                  {entry.orderId && (
                    <p className="mt-1 font-mono text-[10px] break-all text-muted-foreground">
                      Order {entry.orderId}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </section>
  )
}
