import { useId, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"
import { MenuDialog } from "./modals/menu-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategoryCard, CATEGORY_COLORS, categoryColor } from "./category-card"
import type { MenuCategory } from "./model"

const SET_CATEGORY_COLOR = gql`
  mutation SetMenuCategoryColor($categoryId: ID!, $color: String!) {
    setMenuCategoryColor(categoryId: $categoryId, color: $color) {
      id
      color
    }
  }
`

export function CategoryColors({
  categories,
  open,
  onOpenChange,
}: {
  categories: MenuCategory[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const formId = useId()
  const [saving, setSaving] = useState(false)
  const [categoryId, setCategoryId] = useState("")
  const category =
    categories.find((entry) => entry.id === categoryId) ?? categories.at(0)

  return (
    <MenuDialog
      drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Category colors"
      description="Choose the card colors cashiers see when creating an order."
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {category && (
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? "Saving…" : "Save color"}
            </Button>
          )}
        </div>
      }
    >
      {category ? (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">Category</p>
            <Select
              disabled={saving}
              value={category.id}
              onValueChange={(value) => setCategoryId(value ?? "")}
            >
              <SelectTrigger className="w-full" aria-label="Category to color">
                <SelectValue>{category.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CategoryColorEditor
            key={`${category.id}:${open}`}
            category={category}
            formId={formId}
            onSavingChange={setSaving}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a menu category to customize its color.
        </p>
      )}
    </MenuDialog>
  )
}

function CategoryColorEditor({
  category,
  formId,
  onSavingChange,
}: {
  category: MenuCategory
  formId: string
  onSavingChange: (saving: boolean) => void
}) {
  const [color, setColor] = useState(categoryColor(category.color))
  const [save, { loading }] = useMutation(SET_CATEGORY_COLOR)
  return (
    <form
      id={formId}
      className="mt-6 flex flex-col gap-6"
      onSubmit={async (event) => {
        event.preventDefault()
        if (loading) return
        onSavingChange(true)
        try {
          await save({ variables: { categoryId: category.id, color } })
          toast({
            title: "Category color updated",
            description: `${category.name} is ready for the cashier.`,
            status: "success",
          })
        } catch {
          toast({
            title: "Could not save color",
            status: "error",
            description: "Your color wasn't saved. Please try again.",
          })
        } finally {
          onSavingChange(false)
        }
      }}
    >
      <div aria-label="Card preview" className="pointer-events-none" inert>
        <CategoryCard name={category.name} color={color} active fullWidth />
      </div>
      <fieldset disabled={loading} className="min-w-0 space-y-3">
        <legend className="mb-2 text-xs font-medium text-muted-foreground">
          Card background
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((swatch, index) => (
            <button
              key={swatch}
              type="button"
              aria-label={
                ["Sage", "Peach", "Rose", "Sky", "Lavender", "Mint"][index]
              }
              aria-pressed={color.toUpperCase() === swatch}
              onClick={() => {
                setColor(swatch)
              }}
              style={{ backgroundColor: swatch }}
              className={`size-11 rounded-full border border-black/10 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring ${color.toUpperCase() === swatch ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`}
            />
          ))}
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="color"
            value={color}
            onChange={(event) => {
              setColor(event.target.value)
            }}
            className="size-11 cursor-pointer rounded border border-border p-1"
          />
          Custom color
        </label>
      </fieldset>
    </form>
  )
}
