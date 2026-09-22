import { InfoIcon } from "@phosphor-icons/react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { restaurantSlug } from "../onboarding-contract"
import { DiningTypeChoice } from "./onboarding-fields"
import type { OnboardingStepProps } from "./step-types"

export function RestaurantProfileStep({
  values,
  errors,
  updateField,
  slugEdited,
  onSlugEdited,
}: OnboardingStepProps & {
  slugEdited: boolean
  onSlugEdited: () => void
}) {
  return (
    <FieldGroup className="gap-5">
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor="restaurant-name">Restaurant name</FieldLabel>
        <Input
          id="restaurant-name"
          value={values.name}
          onChange={(event) => {
            const name = event.target.value
            updateField("name", name)
            if (!slugEdited) updateField("slug", restaurantSlug(name))
          }}
          autoComplete="organization"
          placeholder="e.g. Ama’s Kitchen"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "restaurant-name-error" : undefined}
          autoFocus
        />
        <FieldError id="restaurant-name-error">{errors.name}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.slug)}>
        <FieldLabel htmlFor="restaurant-slug">Workspace URL</FieldLabel>
        <div className="flex h-10 overflow-hidden rounded-md border border-input bg-muted/30 shadow-xs focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/50">
          <span className="flex items-center border-r border-input px-3 text-sm text-muted-foreground select-none">
            app.pos/
          </span>
          <input
            id="restaurant-slug"
            value={values.slug}
            onChange={(event) => {
              onSlugEdited()
              updateField("slug", restaurantSlug(event.target.value))
            }}
            className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.slug)}
            aria-describedby="restaurant-slug-description restaurant-slug-error"
          />
        </div>
        <FieldDescription id="restaurant-slug-description">
          Lowercase letters, numbers, and hyphens only.
        </FieldDescription>
        <FieldError id="restaurant-slug-error">{errors.slug}</FieldError>
      </Field>

      <Field>
        <FieldLabel>Default order type</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <DiningTypeChoice
            value="TAKEAWAY"
            currentValue={values.defaultDiningType}
            title="Takeaway"
            description="New orders start as takeaway."
            onChange={(value) => updateField("defaultDiningType", value)}
          />
          <DiningTypeChoice
            value="DINE_IN"
            currentValue={values.defaultDiningType}
            title="Dine in"
            description="New orders start as table service."
            onChange={(value) => updateField("defaultDiningType", value)}
          />
        </div>
      </Field>

      <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>Currency is GHS and reporting time uses Africa/Accra.</p>
      </div>
    </FieldGroup>
  )
}
