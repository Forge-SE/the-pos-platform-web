import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react"
import * as Yup from "yup"

import { Button } from "@/components/ui/button"
import { EmptyState, ErrorState } from "@/components/content-state"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { cedisToPesewas, formatMoney } from "@/features/menu/model"

const MENU_SETUP = gql`
  query OnboardingMenu {
    menuCategories {
      id
      name
    }
    menuItems {
      id
      categoryId
      name
      price
    }
  }
`

const CREATE_CATEGORY = gql`
  mutation OnboardingCreateCategory($input: CreateCategoryInput!) {
    createMenuCategory(input: $input) {
      id
      name
    }
  }
`

const CREATE_ITEM = gql`
  mutation OnboardingCreateItem($input: CreateMenuItemInput!) {
    createMenuItem(input: $input) {
      id
      categoryId
      name
      price
    }
  }
`

const menuValues = { categoryName: "Mains", itemName: "", price: "" }

const menuSchema = Yup.object({
  categoryName: Yup.string()
    .trim()
    .min(2, "Enter a category, a dish name, and a price like 25.00.")
    .required("Enter a category, a dish name, and a price like 25.00."),
  itemName: Yup.string()
    .trim()
    .min(2, "Enter a category, a dish name, and a price like 25.00.")
    .required("Enter a category, a dish name, and a price like 25.00."),
  price: Yup.string().test(
    "cedis",
    "Enter a category, a dish name, and a price like 25.00.",
    (value) => cedisToPesewas(value ?? "") !== null
  ),
})

interface MenuData {
  menuCategories: Array<{ id: string; name: string }>
  menuItems: Array<{
    id: string
    categoryId: string
    name: string
    price: number
  }>
}

export function OnboardingMenuStep({
  onBack,
  onContinue,
}: {
  onBack?: () => void
  onContinue: () => void
}) {
  const {
    data,
    refetch,
    loading,
    error: loadError,
  } = useQuery<MenuData>(MENU_SETUP)
  const [createCategory] = useMutation<
    { createMenuCategory: { id: string } },
    { input: { name: string } }
  >(CREATE_CATEGORY)
  const [createItem, itemState] = useMutation(CREATE_ITEM)
  const [error, setError] = useState<string | null>(null)

  const items = data?.menuItems ?? []
  const categories = data?.menuCategories ?? []

  async function addItem(
    values: typeof menuValues,
    helpers: {
      setFieldValue: (field: "itemName" | "price", value: string) => void
    }
  ) {
    const amount = cedisToPesewas(values.price)
    if (amount === null) return
    try {
      setError(null)
      const match = categories.find(
        (category) =>
          category.name.toLowerCase() ===
          values.categoryName.trim().toLowerCase()
      )
      let categoryId = match?.id
      if (!categoryId) {
        const created = await createCategory({
          variables: { input: { name: values.categoryName.trim() } },
        })
        categoryId = created.data?.createMenuCategory.id
      }
      if (!categoryId) throw new Error("The category was not created.")
      await createItem({
        variables: {
          input: {
            categoryId,
            name: values.itemName.trim(),
            price: amount,
          },
        },
      })
      void helpers.setFieldValue("itemName", "")
      void helpers.setFieldValue("price", "")
      await refetch()
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not add that dish."
      )
    }
  }

  return (
    <div className="mt-7">
      <Form
        className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end"
        initialValues={menuValues}
        validationSchema={menuSchema}
        onSubmit={addItem}
      >
        {(formik) => {
          const categoryError = fieldError(formik, "categoryName")
          const itemError = fieldError(formik, "itemName")
          const priceError = fieldError(formik, "price")
          return (
            <>
              <Field data-invalid={Boolean(categoryError)}>
                <FieldLabel htmlFor="opening-category">Category</FieldLabel>
                <Input
                  id="opening-category"
                  name="categoryName"
                  list="shared-menu-categories"
                  value={formik.values.categoryName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Mains"
                  aria-invalid={Boolean(categoryError)}
                />
                <datalist id="shared-menu-categories">
                  {categories.map((category) => (
                    <option key={category.id} value={category.name} />
                  ))}
                </datalist>
                <FieldError>{categoryError}</FieldError>
              </Field>
              <Field data-invalid={Boolean(itemError)}>
                <FieldLabel htmlFor="opening-item">Dish</FieldLabel>
                <Input
                  id="opening-item"
                  name="itemName"
                  value={formik.values.itemName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Jollof rice"
                  aria-invalid={Boolean(itemError)}
                />
                <FieldError>{itemError}</FieldError>
              </Field>
              <Field data-invalid={Boolean(priceError)}>
                <FieldLabel htmlFor="opening-price">Price (GHS)</FieldLabel>
                <Input
                  id="opening-price"
                  name="price"
                  inputMode="decimal"
                  value={formik.values.price}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="25.00"
                  aria-invalid={Boolean(priceError)}
                />
                <FieldError>{priceError}</FieldError>
              </Field>
              <Button type="submit" disabled={itemState.loading}>
                {itemState.loading ? "Adding…" : "Add"}
              </Button>
            </>
          )
        }}
      </Form>
      {error && <FieldError className="mt-3">{error}</FieldError>}
      <ul className="mt-5 divide-y divide-border rounded-lg border">
        {loadError ? (
          <li>
            <ErrorState
              title="Could not load the opening menu."
              onRetry={refetch}
            />
          </li>
        ) : loading ? null : items.length === 0 ? (
          <li>
            <EmptyState
              title="No dishes yet."
              description="Add at least one dish before continuing. You can expand the menu later."
              action={
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    document.getElementById("opening-item")?.focus()
                  }
                >
                  Add a dish
                </Button>
              }
            />
          </li>
        ) : (
          items.map((item) => {
            const category = categories.find(
              (entry) => entry.id === item.categoryId
            )
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{item.name}</span>
                  {category && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {category.name}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{formatMoney(item.price)}</span>
              </li>
            )
          })
        )}
      </ul>
      <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          className="min-w-32"
          onClick={() => {
            if (items.length === 0) {
              setError("Add at least one dish to continue.")
              return
            }
            onContinue()
          }}
        >
          Continue
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
