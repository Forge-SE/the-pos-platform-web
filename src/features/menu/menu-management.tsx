import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { Navigate } from "@tanstack/react-router"
import { Menu } from "@base-ui/react/menu"
import {
  CaretDownIcon,
  FolderPlusIcon,
  ForkKnifeIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { AddItemModal } from "@/features/menu/modals/add-item-modal"
import { CategoryModal } from "@/features/menu/modals/category-modal"
import { ConfigureOptionsModal } from "@/features/menu/modals/configure-options-modal"
import { EditItemModal } from "@/features/menu/modals/edit-item-modal"
import {
  COMPLETE_ITEM_IMAGE_UPLOAD,
  MENU_MANAGEMENT_QUERY,
  SET_ITEM_AVAILABILITY,
  formatMoney,
  mutationMessage,
  uploadMenuImage,
} from "@/features/menu/model"
import type { MenuItem, UploadState, MenuManagementData  } from "@/features/menu/model"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"
import { useUrlState } from "@/lib/url-state"

export function MenuManagement() {
  const profile = getAccessTokenProfile()
  const canManage = hasPermission(profile, "MENU_MANAGE")
  const { data, loading, error, refetch } = useQuery<MenuManagementData>(
    MENU_MANAGEMENT_QUERY,
    { skip: !canManage }
  )
  const [setAvailability] = useMutation(SET_ITEM_AVAILABILITY)
  const [completeImageUpload] = useMutation(COMPLETE_ITEM_IMAGE_UPLOAD)

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(
    {}
  )

  const [addItemParam, setAddItemParam] = useUrlState("addItem")
  const [, setItemStepParam] = useUrlState("itemStep")
  const modalOpen = addItemParam === "1"
  const [optionsParam, setOptionsParam] = useUrlState("options")
  const optionsOpen = optionsParam !== null
  const [categoryParam, setCategoryParam] = useUrlState("category")
  const categoryOpen = categoryParam === "new"
  const [editItemParam, setEditItemParam] = useUrlState("editItem")
  const [configMenuOpen, setConfigMenuOpen] = useState(false)

  const categories = data?.menuCategories ?? []
  const items = data?.menuItems ?? []
  const groups = data?.modifierGroups ?? []
  const editingItem = items.find((item) => item.id === editItemParam) ?? null

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.categoryId !== categoryFilter) {
        return false
      }
      if (query && !item.name.toLowerCase().includes(query)) return false
      return true
    })
  }, [items, search, categoryFilter])

  const itemsByCategory = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        items: filteredItems.filter((item) => item.categoryId === category.id),
      })),
    [categories, filteredItems]
  )

  if (!canManage) return <Navigate to="/overview" replace />

  function openAddModal() {
    setAddItemParam("1")
  }

  function closeAddModal() {
    setAddItemParam(null)
    setItemStepParam(null)
    void refetch()
  }

  function openOptions() {
    setOptionsParam("groups")
  }

  function openCategoryModal() {
    setCategoryParam("new")
  }

  async function toggleAvailability(item: MenuItem, active: boolean) {
    try {
      setFormError(null)
      await setAvailability({ variables: { itemId: item.id, active } })
      await refetch()
    } catch (mutationError) {
      setFormError(
        mutationMessage(mutationError, "Could not update item availability.")
      )
    }
  }

  async function uploadItemImage(itemId: string, file: File) {
    try {
      setUploadStates((current) => ({
        ...current,
        [itemId]: { status: "uploading" },
      }))
      await uploadMenuImage(
        (variables) => completeImageUpload({ variables }),
        itemId,
        file
      )
      setUploadStates((current) => ({
        ...current,
        [itemId]: { status: "verifying" },
      }))
      await refetch()
      setUploadStates((current) => ({
        ...current,
        [itemId]: { status: "done" },
      }))
    } catch (uploadError) {
      setUploadStates((current) => ({
        ...current,
        [itemId]: {
          status: "error",
          message: mutationMessage(uploadError, "Could not upload image."),
        },
      }))
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
            Menu
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build categories, items, modifier choices, and availability.
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <Menu.Root open={configMenuOpen} onOpenChange={setConfigMenuOpen}>
            <div
              className="inline-flex items-center"
              role="group"
              aria-label="Menu setup options"
            >
              <Button
                variant="outline"
                className="rounded-r-none border-r-0"
                aria-haspopup="menu"
                aria-expanded={configMenuOpen}
                onClick={() => setConfigMenuOpen(true)}
              >
                <SlidersHorizontalIcon data-icon="inline-start" />
                Configure
              </Button>
              <Menu.Trigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More menu setup options"
                    title="More menu setup options"
                    className="rounded-l-none"
                  />
                }
              >
                <CaretDownIcon aria-hidden="true" />
              </Menu.Trigger>
            </div>
            <Menu.Portal>
              <Menu.Positioner
                side="bottom"
                align="end"
                sideOffset={8}
                className="z-50 outline-none"
              >
                <Menu.Popup className="min-w-56 origin-[var(--transform-origin)] rounded-lg bg-popover p-1.5 text-popover-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.08),0_8px_24px_oklch(0.18_0.03_150/0.12)] transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)] outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none dark:shadow-[0_0_0_1px_oklch(1_0_0/0.1)]">
                  <Menu.Item
                    className="flex min-h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-xs font-medium outline-none select-none data-highlighted:bg-muted data-highlighted:text-foreground"
                    onClick={openCategoryModal}
                  >
                    <FolderPlusIcon aria-hidden="true" className="size-4" />
                    Add new category
                  </Menu.Item>
                  <Menu.Item
                    className="flex min-h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-xs font-medium outline-none select-none data-highlighted:bg-muted data-highlighted:text-foreground"
                    onClick={openOptions}
                  >
                    <SlidersHorizontalIcon
                      aria-hidden="true"
                      className="size-4"
                    />
                    Configure menu options
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <Button onClick={openAddModal}>
            <PlusIcon data-icon="inline-start" />
            Add to menu
          </Button>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" weight="fill" />
          {formError}
        </div>
      )}

      {error ? (
        <div className="mt-8 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="font-semibold text-destructive">
            Could not load menu setup
          </p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
            <InputGroup className="w-full sm:max-w-xs">
              <InputGroupAddon align="inline-start">
                <MagnifyingGlassIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search menu items…"
                aria-label="Search menu items"
              />
            </InputGroup>
            <div className="flex sm:ml-auto">
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value ?? "ALL")}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by category"
                >
                  <SelectValue placeholder="All categories">
                    {(value) =>
                      value === "ALL" || value == null
                        ? "All categories"
                        : (categories.find((category) => category.id === value)
                            ?.name ?? "All categories")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse overflow-hidden rounded-xl border border-border/70 bg-card"
                >
                  <div className="aspect-[16/9] bg-muted" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/3 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-6 flex min-h-[calc(100svh-22rem)] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
              <ForkKnifeIcon className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-4 text-base font-semibold">
                {items.length === 0
                  ? "Your menu is empty"
                  : "No dishes match your search"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {items.length === 0
                  ? "Add your first dish with a photo, price, and category to start selling."
                  : "Try a different search or category filter."}
              </p>
              {items.length === 0 && (
                <Button className="mt-6" onClick={openAddModal}>
                  <PlusIcon data-icon="inline-start" />
                  Add to menu
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {itemsByCategory
                .filter((category) => category.items.length > 0)
                .map((category) => (
                  <section key={category.id} aria-label={category.name}>
                    <h2 className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                      {category.name} · {category.items.length}
                    </h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {category.items.map((item) => {
                        const uploadState = uploadStates[item.id] ?? {
                          status: "idle" as const,
                        }
                        const busy =
                          uploadState.status === "uploading" ||
                          uploadState.status === "verifying"
                        return (
                          <article
                            key={item.id}
                            className="group overflow-hidden rounded-xl border border-border/70 bg-card transition-shadow hover:shadow-md"
                          >
                            <div className="relative aspect-[16/9] bg-muted">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
                                  <ImageIcon className="size-7" />
                                  <span className="text-xs">No photo yet</span>
                                </div>
                              )}
                              <span className="absolute top-2.5 left-2.5">
                                <Badge
                                  variant="outline"
                                  className={
                                    item.active
                                      ? "border-transparent bg-primary/25 text-primary-foreground backdrop-blur"
                                      : ""
                                  }
                                >
                                  {item.active ? (
                                    <>
                                      <span
                                        aria-hidden="true"
                                        className="size-1.5 rounded-full bg-secondary"
                                      />
                                      Available
                                    </>
                                  ) : (
                                    "86’d"
                                  )}
                                </Badge>
                              </span>
                              <label
                                className={`absolute top-2 right-2 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md bg-black/55 px-2.5 text-xs font-medium text-white backdrop-blur transition-opacity hover:bg-black/70 ${busy ? "pointer-events-none opacity-70" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}
                              >
                                {busy ? (
                                  <SpinnerGapIcon className="size-3.5 animate-spin" />
                                ) : (
                                  <ImageIcon className="size-3.5" />
                                )}
                                {uploadState.status === "uploading"
                                  ? "Uploading…"
                                  : uploadState.status === "verifying"
                                    ? "Verifying…"
                                    : "Change photo"}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="sr-only"
                                  disabled={busy}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    if (file)
                                      void uploadItemImage(item.id, file)
                                    event.currentTarget.value = ""
                                  }}
                                />
                              </label>
                            </div>
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="min-w-0 truncate text-sm font-semibold">
                                  {item.name}
                                </h3>
                                <p className="shrink-0 text-sm font-semibold">
                                  {formatMoney(item.price)}
                                </p>
                              </div>
                              {item.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                              {item.modifierGroups.length > 0 && (
                                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                                  {item.modifierGroups.flatMap((attached) => {
                                    const group = groups.find(
                                      (entry) => entry.id === attached.id
                                    )
                                    const options = (
                                      group?.options ?? []
                                    ).filter((option) => option.active)
                                    if (options.length === 0) {
                                      return [
                                        <li key={attached.id}>
                                          <Badge variant="outline">
                                            {attached.name}
                                          </Badge>
                                        </li>,
                                      ]
                                    }
                                    return options.map((option) => (
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
                                        <span className="truncate">
                                          {option.name}
                                        </span>
                                      </li>
                                    ))
                                  })}
                                </ul>
                              )}
                              {uploadState.status === "error" && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                                  <WarningCircleIcon className="size-3.5" />
                                  {uploadState.message}
                                </p>
                              )}
                              <div className="mt-3.5 flex items-center justify-between border-t border-border/60 pt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditItemParam(item.id)}
                                >
                                  <PencilSimpleIcon data-icon="inline-start" />
                                  Edit
                                </Button>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {item.active ? "On sale" : "Hidden"}
                                  </span>
                                  <Switch
                                    checked={item.active}
                                    onCheckedChange={(active) =>
                                      void toggleAvailability(item, active)
                                    }
                                    aria-label={`${item.active ? "Make" : "Mark"} ${item.name} ${item.active ? "unavailable" : "available"}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </>
      )}

      <AddItemModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeAddModal()
        }}
        onChanged={() => {
          void refetch()
        }}
        categories={categories}
        groups={groups}
        onAddCategory={openCategoryModal}
      />
      <EditItemModal
        item={editingItem}
        open={editItemParam !== null}
        onOpenChange={(open) => {
          if (!open) setEditItemParam(null)
        }}
        onSaved={() => {
          setEditItemParam(null)
          void refetch()
        }}
        onChanged={() => refetch()}
        categories={categories}
        groups={groups}
      />
      <CategoryModal
        open={categoryOpen}
        onOpenChange={(open) => {
          if (!open) setCategoryParam(null)
        }}
        onSaved={() => {
          setCategoryParam(null)
          void refetch()
        }}
      />
      <ConfigureOptionsModal
        open={optionsOpen}
        onOpenChange={(open) => {
          if (!open) setOptionsParam(null)
        }}
        onChanged={() => {
          void refetch()
        }}
        items={items}
        groups={groups}
      />
    </div>
  )
}
