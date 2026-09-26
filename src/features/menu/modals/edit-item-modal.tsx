import { useEffect, useRef, useState } from "react"
import { useMutation } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import {
  CaretLeftIcon,
  CheckCircleIcon,
  ImageIcon,
  PlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import * as Yup from "yup"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ATTACH_MODIFIER_GROUP,
  COMPLETE_ITEM_IMAGE_UPLOAD,
  COMPLETE_OPTION_IMAGE,
  CREATE_MODIFIER_GROUP,
  CREATE_MODIFIER_OPTION,
  DETACH_MODIFIER_GROUP,
  UPDATE_ITEM,
  cedisToPesewas,
  formatMoney,
  mutationMessage,
  uploadMenuImage,
  uploadOptionImage,
} from "@/features/menu/model"
import type { MenuCategory, MenuItem, ModifierGroup } from "@/features/menu/model"

import { MenuDialog } from "./menu-dialog"

const STEPS = ["Details", "Photo", "Choices", "Preview"] as const

type ChoiceKind = "pick-one" | "extras" | "removals"

const CHOICE_KINDS: Array<{
  id: ChoiceKind
  label: string
  detail: string
  namePlaceholder: string
  optionPlaceholder: string
  pricePlaceholder: string
  min: number
  max: number
}> = [
  {
    id: "pick-one",
    label: "Pick one",
    detail: "Required, like a protein or cut",
    namePlaceholder: "Select protein / cut",
    optionPlaceholder: "Grilled Chicken Thigh",
    pricePlaceholder: "0.00",
    min: 1,
    max: 1,
  },
  {
    id: "extras",
    label: "Extras & sides",
    detail: "Optional add-ons with a price",
    namePlaceholder: "Extra add-ons & sides",
    optionPlaceholder: "Boiled Egg (Whole)",
    pricePlaceholder: "4.00",
    min: 0,
    max: 20,
  },
  {
    id: "removals",
    label: "Removals",
    detail: "Optional, like no shito",
    namePlaceholder: "Dietary & ingredient removals",
    optionPlaceholder: "No Coleslaw",
    pricePlaceholder: "0.00",
    min: 0,
    max: 20,
  },
]

function kindOf(group: ModifierGroup, remembered?: ChoiceKind): ChoiceKind {
  if (remembered) return remembered
  if (group.maxSelections <= 1) return "pick-one"
  if (group.options.length > 0 && group.options.every((option) => option.priceDelta === 0)) {
    return "removals"
  }
  return "extras"
}

const itemSchema = Yup.object({
  categoryId: Yup.string().required("Choose a category."),
  name: Yup.string().trim().required("Enter an item name."),
  description: Yup.string(),
  price: Yup.string().test(
    "cedis",
    "Use a valid cedi amount with no more than two decimal places.",
    (value) => cedisToPesewas(value ?? "") !== null,
  ),
})

function cedisValue(pesewas: number) {
  const whole = Math.floor(pesewas / 100)
  const cents = pesewas % 100
  return `${whole}.${String(cents).padStart(2, "0")}`
}

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="grid w-full grid-cols-4" aria-label="Progress">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1
        const state = stepNumber < step ? "done" : stepNumber === step ? "now" : "next"
        const align =
          index === 0
            ? "items-start text-left"
            : index === STEPS.length - 1
              ? "items-end text-right"
              : "items-center text-center"
        return (
          <li key={label} className={`flex min-w-0 flex-col ${align}`}>
            <div className="flex w-full items-center">
              {index > 0 && <span aria-hidden="true" className="h-px flex-1 bg-border/70" />}
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

function choiceMode(group: ModifierGroup) {
  if (group.maxSelections <= 1) return "radio" as const
  return group.options.some((option) => option.priceDelta !== 0) ? "cards" as const : "chips" as const
}

export function EditItemModal({
  item,
  open,
  onOpenChange,
  onSaved,
  onChanged,
  categories,
  groups,
}: {
  item: MenuItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  onChanged: () => Promise<unknown>
  categories: MenuCategory[]
  groups: ModifierGroup[]
}) {
  const [updateItem, updateMutation] = useMutation(UPDATE_ITEM)
  const [completeImageUpload] = useMutation(COMPLETE_ITEM_IMAGE_UPLOAD)
  const [completeOptionImage] = useMutation(COMPLETE_OPTION_IMAGE)
  const [createGroup, groupMutation] = useMutation<{ createModifierGroup: { id: string } }>(
    CREATE_MODIFIER_GROUP,
  )
  const [createOption, optionMutation] = useMutation<{ createModifierOption: { id: string } }>(
    CREATE_MODIFIER_OPTION,
  )
  const [attachGroup] = useMutation(ATTACH_MODIFIER_GROUP)
  const [detachGroup] = useMutation(DETACH_MODIFIER_GROUP)

  const [step, setStep] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [choiceKind, setChoiceKind] = useState<ChoiceKind>("pick-one")
  const [choiceName, setChoiceName] = useState("")
  const [groupKinds, setGroupKinds] = useState<Record<string, ChoiceKind>>({})
  const [existingChoiceId, setExistingChoiceId] = useState("")
  const [optionDrafts, setOptionDrafts] = useState<
    Record<string, { name: string; price: string; file: File | null }>
  >({})
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null)
  const [previewPick, setPreviewPick] = useState<Record<string, string[]>>({})
  const dishPhotoRef = useRef<HTMLInputElement>(null)
  const optionPhotoRef = useRef<HTMLInputElement>(null)
  const optionPhotoTarget = useRef<string | null>(null)
  const openedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      openedFor.current = null
      return
    }
    if (item && openedFor.current !== item.id) {
      openedFor.current = item.id
      setStep(1)
      setFormError(null)
      setPreviewPick({})
    }
  }, [open, item])

  const attachedIds = new Set(item?.modifierGroups.map((group) => group.id) ?? [])
  const attached = groups.filter((group) => attachedIds.has(group.id))
  const available = groups.filter((group) => !attachedIds.has(group.id))
  const categoryName = categories.find((category) => category.id === item?.categoryId)?.name

  const initialValues = {
    categoryId: item?.categoryId ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item ? cedisValue(item.price) : "",
  }

  function draftFor(groupId: string) {
    return optionDrafts[groupId] ?? { name: "", price: "", file: null }
  }

  function setDraft(groupId: string, patch: Partial<{ name: string; price: string; file: File | null }>) {
    setOptionDrafts((current) => ({
      ...current,
      [groupId]: { ...draftFor(groupId), ...patch },
    }))
  }

  async function submitDetails(values: typeof initialValues) {
    if (!item) return
    const price = cedisToPesewas(values.price)
    if (price === null) return
    try {
      setFormError(null)
      await updateItem({
        variables: {
          input: {
            itemId: item.id,
            categoryId: values.categoryId,
            name: values.name.trim(),
            description: values.description.trim() || null,
            price,
          },
        },
      })
      await onChanged()
      setStep(2)
    } catch (mutationError) {
      setFormError(mutationMessage(mutationError, "Could not update this dish."))
    }
  }

  async function changeDishPhoto(file: File) {
    if (!item) return
    try {
      setPhotoBusy(true)
      setFormError(null)
      await uploadMenuImage(
        (variables) => completeImageUpload({ variables }),
        item.id,
        file,
      )
      await onChanged()
    } catch (mutationError) {
      setFormError(mutationMessage(mutationError, "Could not upload the photo."))
    } finally {
      setPhotoBusy(false)
    }
  }

  async function addExistingChoice() {
    if (!item || !existingChoiceId) return
    try {
      setFormError(null)
      setPendingGroupId(existingChoiceId)
      await attachGroup({
        variables: { menuItemId: item.id, modifierGroupId: existingChoiceId },
      })
      setExistingChoiceId("")
      await onChanged()
    } catch (mutationError) {
      setFormError(mutationMessage(mutationError, "Could not add that choice."))
    } finally {
      setPendingGroupId(null)
    }
  }

  async function removeChoice(groupId: string) {
    if (!item) return
    try {
      setFormError(null)
      setPendingGroupId(groupId)
      await detachGroup({
        variables: { menuItemId: item.id, modifierGroupId: groupId },
      })
      await onChanged()
    } catch (mutationError) {
      setFormError(mutationMessage(mutationError, "Could not remove that choice."))
    } finally {
      setPendingGroupId(null)
    }
  }

  async function addNewChoice() {
    if (!item) return
    const kind = CHOICE_KINDS.find((entry) => entry.id === choiceKind) ?? CHOICE_KINDS[0]
    const name = choiceName.trim()
    if (!name) {
      setFormError(`Name it, for example ${kind.namePlaceholder}.`)
      return
    }
    try {
      setFormError(null)
      const created = await createGroup({
        variables: {
          input: { name, minSelections: kind.min, maxSelections: kind.max },
        },
      })
      const groupId = created.data?.createModifierGroup.id
      if (!groupId) throw new Error("The choice was not created.")
      setGroupKinds((current) => ({ ...current, [groupId]: kind.id }))
      await attachGroup({
        variables: { menuItemId: item.id, modifierGroupId: groupId },
      })
      setChoiceName("")
      await onChanged()
    } catch (mutationError) {
      setFormError(mutationMessage(mutationError, "Could not add that choice."))
    }
  }

  async function addOption(groupId: string, kind: ChoiceKind) {
    const draft = draftFor(groupId)
    const priceSource = kind === "removals" ? "0" : draft.price
    const priceDelta = cedisToPesewas(priceSource === "" ? "0" : priceSource, true)
    const kindMeta = CHOICE_KINDS.find((entry) => entry.id === kind) ?? CHOICE_KINDS[0]
    if (!draft.name.trim()) {
      setFormError(`Name the option, for example ${kindMeta.optionPlaceholder}.`)
      return
    }
    if (priceDelta === null) {
      setFormError("Use an extra price like 5.00, or 0.00 when it is included.")
      return
    }
    try {
      setFormError(null)
      setPendingGroupId(groupId)
      const created = await createOption({
        variables: {
          input: { groupId, name: draft.name.trim(), priceDelta },
        },
      })
      const optionId = created.data?.createModifierOption.id
      if (!optionId) throw new Error("The option was not created.")
      if (draft.file) {
        await uploadOptionImage(
          (variables) => completeOptionImage({ variables }),
          optionId,
          draft.file,
        )
      }
      setDraft(groupId, { name: "", price: "", file: null })
      await onChanged()
    } catch (mutationError) {
      setFormError(mutationMessage(mutationError, "Could not add that option."))
    } finally {
      setPendingGroupId(null)
    }
  }

  async function changeOptionPhoto(optionId: string, file: File) {
    try {
      setFormError(null)
      await uploadOptionImage(
        (variables) => completeOptionImage({ variables }),
        optionId,
        file,
      )
      await onChanged()
    } catch (mutationError) {
      setFormError(mutationMessage(mutationError, "Could not upload the option photo."))
    }
  }

  const descriptions = [
    "Name, price, and where it sits on the menu.",
    "The photo guests see on the dish card.",
    "Size, spice, extras. Use one you already have, or add a new one.",
    "This is the dish at the counter.",
  ]

  return (
    <MenuDialog
      wide
      open={open}
      onOpenChange={(next) => {
        if (!next) setFormError(null)
        onOpenChange(next)
      }}
      title={item ? `Edit ${item.name}` : "Edit dish"}
      description={descriptions[step - 1] ?? descriptions[0]}
      footer={
        <div className="flex justify-between gap-2">
          {step === 1 ? (
            <Dialog.Close
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
          ) : (
            <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>
              <CaretLeftIcon data-icon="inline-start" />
              Back
            </Button>
          )}
          {step === 1 && (
            <Button type="submit" form="edit-item-form" disabled={updateMutation.loading || !item}>
              {updateMutation.loading ? "Saving…" : "Continue"}
            </Button>
          )}
          {step === 2 && (
            <Button type="button" onClick={() => setStep(3)} disabled={photoBusy}>
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button type="button" onClick={() => setStep(4)}>
              Preview
            </Button>
          )}
          {step === 4 && (
            <Button type="button" onClick={onSaved}>
              <CheckCircleIcon data-icon="inline-start" />
              Done
            </Button>
          )}
        </div>
      }
    >
      <StepIndicator step={step} />
      {formError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" weight="fill" />
          {formError}
        </div>
      )}

      {step === 1 && (
        <Form
          id="edit-item-form"
          className="mt-6 space-y-4"
          initialValues={initialValues}
          validationSchema={itemSchema}
          onSubmit={submitDetails}
        >
          {(formik) => {
            const categoryError = fieldError(formik, "categoryId")
            const nameError = fieldError(formik, "name")
            const priceError = fieldError(formik, "price")
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(categoryError)}>
                    <FieldLabel>Category</FieldLabel>
                    <Select
                      value={formik.values.categoryId}
                      onValueChange={(value) => void formik.setFieldValue("categoryId", value ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Mains">
                          {(value) =>
                            categories.find((category) => category.id === value)?.name ?? "Mains"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>{categoryError}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(nameError)}>
                    <FieldLabel htmlFor="edit-item-name">Item name</FieldLabel>
                    <Input
                      id="edit-item-name"
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="Jollof rice"
                      aria-invalid={Boolean(nameError)}
                    />
                    <FieldError>{nameError}</FieldError>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="edit-item-description">Description</FieldLabel>
                  <Textarea
                    id="edit-item-description"
                    name="description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Smoky party jollof with grilled chicken"
                  />
                </Field>
                <Field className="max-w-48" data-invalid={Boolean(priceError)}>
                  <FieldLabel htmlFor="edit-item-price">Price (GHS)</FieldLabel>
                  <Input
                    id="edit-item-price"
                    name="price"
                    inputMode="decimal"
                    value={formik.values.price}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="45.00"
                    aria-invalid={Boolean(priceError)}
                  />
                  <FieldError>{priceError}</FieldError>
                </Field>
              </>
            )
          }}
        </Form>
      )}

      {step === 2 && item && (
        <div className="mt-6">
          <input
            ref={dishPhotoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={photoBusy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void changeDishPhoto(file)
              event.currentTarget.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => dishPhotoRef.current?.click()}
            disabled={photoBusy}
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/20 text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:cursor-wait"
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <>
                <ImageIcon className="size-8" />
                <span className="text-sm font-medium">
                  {photoBusy ? "Uploading…" : "Photo of the dish"}
                </span>
                <span className="text-xs">JPEG, PNG, or WebP · up to 5 MiB</span>
              </>
            )}
          </button>
        </div>
      )}

      {step === 3 && item && (
        <div className="mt-6 space-y-4">
          <input
            ref={optionPhotoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              const optionId = optionPhotoTarget.current
              if (file && optionId) void changeOptionPhoto(optionId, file)
              optionPhotoTarget.current = null
              event.currentTarget.value = ""
            }}
          />
          {available.length > 0 && (
            <div className="flex items-end gap-2">
              <Field className="min-w-0 flex-1">
                <FieldLabel>Use a choice you already have</FieldLabel>
                <Select
                  value={existingChoiceId}
                  onValueChange={(value) => setExistingChoiceId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Size">
                      {(value) => available.find((group) => group.id === value)?.name ?? "Size"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button
                type="button"
                variant="outline"
                disabled={!existingChoiceId || pendingGroupId !== null}
                onClick={() => void addExistingChoice()}
              >
                Add
              </Button>
            </div>
          )}

          {attached.map((group) => {
            const draft = draftFor(group.id)
            const kind = kindOf(group, groupKinds[group.id])
            const kindMeta = CHOICE_KINDS.find((entry) => entry.id === kind) ?? CHOICE_KINDS[0]
            return (
              <section key={group.id} className="rounded-xl border border-border/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{group.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {kindMeta.label}
                      {kind === "pick-one" ? " · Required" : " · Optional"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pendingGroupId === group.id}
                    onClick={() => void removeChoice(group.id)}
                  >
                    Remove
                  </Button>
                </div>
                <ul className="mt-3 space-y-2">
                  {group.options.map((option) => (
                    <li key={option.id} className="flex items-center gap-2 text-sm">
                      {option.imageUrl ? (
                        <img src={option.imageUrl} alt="" className="size-9 rounded-md object-cover" />
                      ) : (
                        <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">{option.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.priceDelta > 0
                          ? `+${formatMoney(option.priceDelta)}`
                          : "Included"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          optionPhotoTarget.current = option.id
                          optionPhotoRef.current?.click()
                        }}
                      >
                        Photo
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className={`mt-3 grid gap-2 sm:items-end ${kind === "removals" ? "sm:grid-cols-[1fr_auto_auto]" : "sm:grid-cols-[1fr_7rem_auto_auto]"}`}>
                  <Field>
                    <FieldLabel htmlFor={`option-name-${group.id}`}>Option</FieldLabel>
                    <Input
                      id={`option-name-${group.id}`}
                      value={draft.name}
                      onChange={(event) => setDraft(group.id, { name: event.target.value })}
                      placeholder={kindMeta.optionPlaceholder}
                    />
                  </Field>
                  {kind !== "removals" && (
                  <Field>
                    <FieldLabel htmlFor={`option-price-${group.id}`}>Extra (GHS)</FieldLabel>
                    <Input
                      id={`option-price-${group.id}`}
                      inputMode="decimal"
                      value={draft.price}
                      onChange={(event) => setDraft(group.id, { price: event.target.value })}
                      placeholder={kindMeta.pricePlaceholder}
                    />
                  </Field>
                  )}
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-input px-3 text-xs font-medium">
                    {draft.file ? "Photo ready" : "Photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) =>
                        setDraft(group.id, { file: event.target.files?.[0] ?? null })
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    disabled={pendingGroupId === group.id || optionMutation.loading}
                    onClick={() => void addOption(group.id, kind)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Add
                  </Button>
                </div>
              </section>
            )
          })}

          <section className="rounded-xl border border-dashed border-border/70 p-3">
            <h3 className="text-sm font-semibold">Add to this dish</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Kind of choice">
              {CHOICE_KINDS.map((kind) => {
                const selected = choiceKind === kind.id
                return (
                  <button
                    key={kind.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setChoiceKind(kind.id)}
                    className={`rounded-lg border px-3 py-2 text-left ${
                      selected ? "border-secondary bg-primary/20" : "border-border bg-card"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{kind.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{kind.detail}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <Field className="min-w-0 flex-1">
                <FieldLabel htmlFor="new-choice-name">Name</FieldLabel>
                <Input
                  id="new-choice-name"
                  value={choiceName}
                  onChange={(event) => setChoiceName(event.target.value)}
                  placeholder={CHOICE_KINDS.find((kind) => kind.id === choiceKind)?.namePlaceholder}
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                disabled={groupMutation.loading}
                onClick={() => void addNewChoice()}
              >
                <PlusIcon data-icon="inline-start" />
                Add
              </Button>
            </div>
          </section>
        </div>
      )}

      {step === 4 && item && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border/70">
          <div className="relative h-36 bg-muted">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                No photo yet
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {categoryName}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{item.name}</h3>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">Base {formatMoney(item.price)}</p>
            <div className="mt-5 space-y-5">
              {attached.length === 0 && (
                <p className="text-sm text-muted-foreground">This dish is served as listed.</p>
              )}
              {attached.map((group, index) => {
                const selected = previewPick[group.id] ?? []
                return (
                  <fieldset key={group.id}>
                    <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold tracking-[0.08em] uppercase">
                      <span>
                        {index + 1}. {group.name}
                      </span>
                      <span className={group.minSelections > 0 ? "text-destructive" : "text-muted-foreground"}>
                        {group.minSelections > 0 ? "Required" : "Optional"}
                      </span>
                    </legend>
                    <PreviewOptions
                      group={group}
                      selected={selected}
                      onToggle={(optionId) =>
                        setPreviewPick((current) => {
                          const chosen = current[group.id] ?? []
                          if (group.maxSelections <= 1) {
                            return { ...current, [group.id]: [optionId] }
                          }
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
                    />
                  </fieldset>
                )
              })}
            </div>
            <Field className="mt-5">
              <FieldLabel htmlFor="preview-kitchen-notes">Special kitchen notes</FieldLabel>
              <Textarea
                id="preview-kitchen-notes"
                readOnly
                placeholder="e.g. Extra hot shito on the side, cut chicken into smaller pieces..."
              />
            </Field>
          </div>
        </div>
      )}
    </MenuDialog>
  )
}

function PreviewOptions({
  group,
  selected,
  onToggle,
}: {
  group: ModifierGroup
  selected: string[]
  onToggle: (optionId: string) => void
}) {
  const mode = choiceMode(group)
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                on ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card"
              }`}
            >
              {option.imageUrl ? (
                <img src={option.imageUrl} alt="" className="size-5 shrink-0 rounded-full object-cover" />
              ) : null}
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
              className={`rounded-xl border px-3 py-3 text-left ${
                on ? "border-secondary bg-primary/20" : "border-border bg-card"
              }`}
            >
              <span className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                    on ? "border-secondary bg-secondary text-secondary-foreground" : "border-input"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                {option.imageUrl ? (
                  <img src={option.imageUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" />
                ) : null}
                {option.name}
              </span>
              <span className="mt-2 block pl-6 text-xs font-medium text-secondary">
                {option.priceDelta > 0 ? `+${formatMoney(option.priceDelta)}` : "Included"}
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
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm ${
              on ? "border-secondary bg-primary/20" : "border-border bg-card"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`flex size-4 items-center justify-center rounded-full border ${
                  on ? "border-secondary" : "border-input"
                }`}
              >
                {on && <span className="size-2 rounded-full bg-secondary" />}
              </span>
              {option.imageUrl ? (
                <img src={option.imageUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" />
              ) : null}
              {option.name}
            </span>
            <span className={`text-xs font-medium ${option.priceDelta > 0 ? "text-secondary" : "text-muted-foreground"}`}>
              {option.priceDelta > 0 ? `+${formatMoney(option.priceDelta)}` : "Included"}
            </span>
          </button>
        )
      })}
    </div>
  )
}
