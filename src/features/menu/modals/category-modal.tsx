import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation } from "@apollo/client/react"
import { PlusIcon, WarningCircleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  CREATE_CATEGORY,
  mutationMessage,
} from "@/features/menu/model"

import { MenuDialog } from "./menu-dialog"

export function CategoryModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [createCategory, categoryMutation] = useMutation(CREATE_CATEGORY)
  const [categoryName, setCategoryName] = useState("")
  const [sortOrder, setSortOrder] = useState("")
  const [categoryError, setCategoryError] = useState<string | null>(null)

  function reset() {
    setCategoryName("")
    setSortOrder("")
    setCategoryError(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const order = sortOrder.trim() === "" ? undefined : Number(sortOrder)
    if (!categoryName.trim() || (order !== undefined && !Number.isInteger(order))) {
      setCategoryError("Enter a category name and a whole-number sort order.")
      return
    }
    try {
      setCategoryError(null)
      await createCategory({
        variables: { input: { name: categoryName.trim(), sortOrder: order } },
      })
      reset()
      onSaved()
    } catch (mutationError) {
      setCategoryError(
        mutationMessage(mutationError, "Could not create category.")
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
      title="Add new category"
      description="Create a section customers and staff use to browse the menu."
    >
      {categoryError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0" weight="fill" />
          {categoryError}
        </div>
      )}
      <form
        className={`grid gap-4 sm:grid-cols-[1fr_120px_auto] ${categoryError ? "mt-4" : ""}`}
        onSubmit={submit}
      >
        <Field>
          <FieldLabel htmlFor="modal-category-name">Name</FieldLabel>
          <Input
            id="modal-category-name"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Drinks"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="modal-category-order">Sort order</FieldLabel>
          <Input
            id="modal-category-order"
            type="number"
            step="1"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            placeholder="0"
          />
        </Field>
        <Button
          type="submit"
          className="self-end"
          disabled={categoryMutation.loading}
        >
          <PlusIcon data-icon="inline-start" />
          {categoryMutation.loading ? "Adding…" : "Add"}
        </Button>
      </form>
    </MenuDialog>
  )
}
