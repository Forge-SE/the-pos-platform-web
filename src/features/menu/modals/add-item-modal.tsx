import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { useMutation } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import {
  CaretLeftIcon,
  CheckCircleIcon,
  ImageIcon,
  InfoIcon,
  PlusIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUrlState } from "@/lib/url-state"
import {
  ATTACH_MODIFIER_GROUP,
  COMPLETE_ITEM_IMAGE_UPLOAD,
  CREATE_ITEM,
  REQUEST_ITEM_IMAGE_UPLOAD,
  cedisToPesewas,
  mutationMessage,
  uploadMenuImage,
} from "@/features/menu/model"
import type {
  CreatedItem,
  ImageUploadData,
  MenuCategory,
  ModifierGroup,
  UploadState,
} from "@/features/menu/model"

import { MenuDialog } from "./menu-dialog"

const STEPS = ["Details", "Photo", "Modifiers"] as const

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="grid w-full grid-cols-3" aria-label="Progress">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1
        const state =
          stepNumber < step ? "done" : stepNumber === step ? "now" : "next"
        const align =
          index === 0
            ? "items-start text-left"
            : index === STEPS.length - 1
              ? "items-end text-right"
              : "items-center text-center"
        return (
          <li key={label} className={`flex min-w-0 flex-col ${align}`}>
            <div className="flex w-full items-center">
              {index > 0 && (
                <span aria-hidden="true" className="h-px flex-1 bg-border/70" />
              )}
              <span
                aria-current={state === "now" ? "step" : undefined}
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  state === "done"
                    ? "bg-primary text-primary-foreground"
                    : state === "now"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {state === "done" ? <CheckCircleIcon className="size-3.5" /> : stepNumber}
              </span>
              {index < STEPS.length - 1 && (
                <span aria-hidden="true" className="h-px flex-1 bg-border/70" />
              )}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium ${state === "next" ? "text-muted-foreground" : ""}`}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function AddItemModal({
  open,
  onOpenChange,
  onChanged,
  categories,
  groups,
  onAddCategory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  categories: MenuCategory[]
  groups: ModifierGroup[]
  onAddCategory: () => void
}) {
  const [createItem, itemMutation] = useMutation<{ createMenuItem: CreatedItem }>(
    CREATE_ITEM
  )
  const [attachGroup, attachMutation] = useMutation(ATTACH_MODIFIER_GROUP)
  const [requestImageUpload] = useMutation<ImageUploadData>(
    REQUEST_ITEM_IMAGE_UPLOAD
  )
  const [completeImageUpload] = useMutation(COMPLETE_ITEM_IMAGE_UPLOAD)

  const [itemStepParam, setItemStepParam] = useUrlState("itemStep")
  const [createdItem, setCreatedItem] = useState<CreatedItem | null>(null)
  const step =
    open && createdItem && (itemStepParam === "2" || itemStepParam === "3")
      ? Number(itemStepParam)
      : 1
  const setStep = (next: number) =>
    setItemStepParam(next === 1 ? null : String(next))

  const [itemCategoryId, setItemCategoryId] = useState("")
  const [itemName, setItemName] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [itemPrice, setItemPrice] = useState("")
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalUpload, setModalUpload] = useState<UploadState>({ status: "idle" })
  const [modalPreview, setModalPreview] = useState<string | null>(null)
  const [attachedGroups, setAttachedGroups] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setItemStepParam(null)
    setCreatedItem(null)
    setItemCategoryId("")
    setItemName("")
    setItemDescription("")
    setItemPrice("")
    setModalError(null)
    setModalUpload({ status: "idle" })
    setModalPreview(null)
    setAttachedGroups([])
  }

  async function submitNewItem(event: FormEvent) {
    event.preventDefault()
    const price = cedisToPesewas(itemPrice)
    if (!itemCategoryId || !itemName.trim() || price === null) {
      setModalError(
        "Choose a category, enter an item name, and use a valid cedi amount with no more than two decimal places."
      )
      return
    }
    try {
      setModalError(null)
      const result = await createItem({
        variables: {
          input: {
            categoryId: itemCategoryId,
            name: itemName.trim(),
            description: itemDescription.trim() || null,
            price,
          },
        },
      })
      const item = result.data?.createMenuItem
      if (!item) throw new Error("The menu item could not be created.")
      setCreatedItem(item)
      setStep(2)
      onChanged()
    } catch (mutationError) {
      setModalError(mutationMessage(mutationError, "Could not create menu item."))
    }
  }

  async function uploadModalPhoto(file: File) {
    if (!createdItem) return
    setModalPreview(URL.createObjectURL(file))
    try {
      setModalUpload({ status: "uploading" })
      await uploadMenuImage(
        (variables) => requestImageUpload({ variables }),
        (variables) => completeImageUpload({ variables }),
        createdItem.id,
        file
      )
      setModalUpload({ status: "verifying" })
      onChanged()
      setModalUpload({ status: "done" })
    } catch (uploadError) {
      setModalUpload({
        status: "error",
        message: mutationMessage(uploadError, "Could not upload image."),
      })
    }
  }

  async function toggleModalGroup(groupId: string) {
    if (!createdItem || attachedGroups.includes(groupId)) return
    try {
      setModalError(null)
      await attachGroup({
        variables: { menuItemId: createdItem.id, modifierGroupId: groupId },
      })
      setAttachedGroups((current) => [...current, groupId])
      onChanged()
    } catch (mutationError) {
      setModalError(
        mutationMessage(mutationError, "Could not attach modifier group.")
      )
    }
  }

  return (
    <MenuDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      title="Add to menu"
      description={
        createdItem
          ? `${createdItem.name} · step ${step} of ${STEPS.length}`
          : "Create a new dish for your menu."
      }
      footer={
        <>
          {step === 1 && (
            <div className="flex justify-end gap-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button
                type="submit"
                form="add-item-details-form"
                disabled={itemMutation.loading || categories.length === 0}
              >
                <PlusIcon data-icon="inline-start" />
                {itemMutation.loading ? "Creating…" : "Continue to photo"}
              </Button>
            </div>
          )}
          {step === 2 && createdItem && (
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <CaretLeftIcon data-icon="inline-start" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  Skip for now
                </Button>
                <Button onClick={() => setStep(3)}>Continue</Button>
              </div>
            </div>
          )}
          {step === 3 && createdItem && (
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <CaretLeftIcon data-icon="inline-start" />
                Back
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                <CheckCircleIcon data-icon="inline-start" />
                Done
              </Button>
            </div>
          )}
        </>
      }
    >
      <StepIndicator step={step} />
      {modalError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" weight="fill" />
          {modalError}
        </div>
      )}

      {step === 1 && (
        <form
          id="add-item-details-form"
          className="mt-6 space-y-4"
          onSubmit={submitNewItem}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select value={itemCategoryId} onValueChange={(value) => setItemCategoryId(value ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose category" /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-item-name">Item name</FieldLabel>
              <Input id="new-item-name" value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Jollof rice" />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="new-item-description">Description</FieldLabel>
            <Textarea id="new-item-description" value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} placeholder="Optional description" />
          </Field>
          <Field className="max-w-48">
            <FieldLabel htmlFor="new-item-price">Price (GHS)</FieldLabel>
            <Input id="new-item-price" inputMode="decimal" value={itemPrice} onChange={(event) => setItemPrice(event.target.value)} placeholder="25.00" />
            <FieldDescription>Up to two decimal places.</FieldDescription>
          </Field>
          {categories.length === 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <InfoIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                No categories yet — you&apos;ll need one before adding
                dishes.{" "}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2 hover:text-foreground"
                  onClick={onAddCategory}
                >
                  Add new category
                </button>
              </span>
            </p>
          )}
        </form>
      )}

      {step === 2 && createdItem && (
        <div className="mt-6">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={
              modalUpload.status === "uploading" ||
              modalUpload.status === "verifying"
            }
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void uploadModalPhoto(file)
              event.currentTarget.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={
              modalUpload.status === "uploading" ||
              modalUpload.status === "verifying"
            }
            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/20 text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:cursor-wait disabled:opacity-70"
          >
            {modalPreview ? (
              <img src={modalPreview} alt="" className="size-full object-cover" />
            ) : (
              <>
                <ImageIcon className="size-8" />
                <span className="text-sm font-medium">
                  {modalUpload.status === "uploading"
                    ? "Uploading…"
                    : modalUpload.status === "verifying"
                      ? "Verifying…"
                      : "Choose a photo for this dish"}
                </span>
                <span className="text-xs">JPEG, PNG, or WebP · up to 5 MiB</span>
              </>
            )}
          </button>
          {(modalUpload.status === "uploading" ||
            modalUpload.status === "verifying") && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <SpinnerGapIcon className="size-3.5 animate-spin" />
              {modalUpload.status === "uploading"
                ? "Uploading photo…"
                : "Verifying photo on the server…"}
            </p>
          )}
          {modalUpload.status === "done" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-secondary">
              <CheckCircleIcon className="size-3.5" weight="fill" />
              Photo verified and live on the menu card.
            </p>
          )}
          {modalUpload.status === "error" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
              <WarningCircleIcon className="size-3.5" weight="fill" />
              {modalUpload.message}
            </p>
          )}
        </div>
      )}

      {step === 3 && createdItem && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            Attach modifier groups to{" "}
            <span className="font-semibold text-foreground">
              {createdItem.name}
            </span>
            . Groups need enough options to satisfy their maximum before they
            can be attached.
          </p>
          <div className="mt-4 space-y-2">
            {groups.map((group) => {
              const ready = group.options.length >= group.maxSelections
              const attached = attachedGroups.includes(group.id)
              return (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.options.length} options
                      {!ready && " · add options first"}
                    </p>
                  </div>
                  <Button
                    variant={attached ? "secondary" : "outline"}
                    size="sm"
                    disabled={!ready || attached || attachMutation.loading}
                    onClick={() => void toggleModalGroup(group.id)}
                  >
                    {attached ? (
                      <>
                        <CheckCircleIcon data-icon="inline-start" /> Attached
                      </>
                    ) : (
                      <>
                        <PlusIcon data-icon="inline-start" /> Attach
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
            {groups.length === 0 && (
              <p className="rounded-lg bg-muted/20 p-4 text-sm text-muted-foreground">
                No modifier groups yet. Create them with Configure Menu
                Options — you can finish this dish now and attach groups
                later.
              </p>
            )}
          </div>
        </div>
      )}
    </MenuDialog>
  )
}
