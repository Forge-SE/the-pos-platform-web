import { useState } from "react"
import { useMutation } from "@apollo/client/react"
import { PlusIcon, WarningCircleIcon } from "@phosphor-icons/react"
import * as Yup from "yup"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  CREATE_CATEGORY,
  mutationMessage,
} from "@/features/menu/model"

import { MenuDialog } from "./menu-dialog"

const categoryValues = { name: "" }

const categorySchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(1, "Enter a category name.")
    .required("Enter a category name."),
})

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
  const [categoryError, setCategoryError] = useState<string | null>(null)

  async function submit(
    values: typeof categoryValues,
    helpers: { resetForm: () => void },
  ) {
    try {
      setCategoryError(null)
      await createCategory({
        variables: { input: { name: values.name.trim() } },
      })
      helpers.resetForm()
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
        if (!next) setCategoryError(null)
        onOpenChange(next)
      }}
      title="Add new category"
      description="Name this section of the menu."
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
      <Form
        className={`flex items-end gap-3 ${categoryError ? "mt-4" : ""}`}
        key={String(open)}
        initialValues={categoryValues}
        validationSchema={categorySchema}
        onSubmit={submit}
      >
        {(formik) => {
          const nameError = fieldError(formik, "name")
          return (
            <>
              <Field className="min-w-0 flex-1" data-invalid={Boolean(nameError)}>
                <FieldLabel htmlFor="modal-category-name">Name</FieldLabel>
                <Input
                  id="modal-category-name"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Drinks"
                  aria-invalid={Boolean(nameError)}
                />
                <FieldError>{nameError}</FieldError>
              </Field>
              <Button
                type="submit"
                className="self-end"
                disabled={categoryMutation.loading}
              >
                <PlusIcon data-icon="inline-start" />
                {categoryMutation.loading ? "Adding…" : "Add"}
              </Button>
            </>
          )
        }}
      </Form>
    </MenuDialog>
  )
}
