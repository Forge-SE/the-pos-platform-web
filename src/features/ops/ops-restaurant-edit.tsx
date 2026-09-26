import { useState } from "react"
import type { FormikProps } from "formik"
import { useMutation, useQuery } from "@apollo/client/react"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { OpsModal } from "@/features/ops/ops-overlays"
import {
  GHANA_REGIONS,
  RESTAURANT_DETAIL_QUERY,
  UPDATE_RESTAURANT,
  WEEKDAYS,
} from "@/features/ops/ops-model"
import type { PlatformRestaurant } from "@/features/ops/ops-model"
import { mutationMessage } from "@/features/menu/model"
import { opsAuthContext } from "@/lib/ops-token"

const dayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d/

type HourRow = {
  day: string
  closed: boolean
  opens: string
  closes: string
}

type EditValues = {
  name: string
  description: string
  address: string
  city: string
  region: string
  defaultDiningType: "DINE_IN" | "TAKEAWAY"
  openingHours: HourRow[]
  businessRegistrationNumber: string
  tin: string
  foodHygienePermit: string
  districtAssemblyPermit: string
  notes: string
}

const editSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, "Enter the restaurant name.")
    .required("Enter the restaurant name."),
  description: Yup.string()
    .trim()
    .max(800, "Keep the description under 800 characters."),
  address: Yup.string()
    .trim()
    .min(2, "Enter the street address.")
    .required("Enter the street address."),
  city: Yup.string()
    .trim()
    .min(2, "Enter the city.")
    .required("Enter the city."),
  region: Yup.string().trim().required("Choose a region."),
  defaultDiningType: Yup.string()
    .oneOf(["DINE_IN", "TAKEAWAY"])
    .required("Choose an order type."),
  openingHours: Yup.array().test(
    "hours",
    "Keep at least one day open, and make sure each open day closes after it opens.",
    (value) => {
      if (!Array.isArray(value) || value.length === 0) return false
      const openDays = value.filter(
        (entry) => entry && typeof entry === "object" && !entry.closed
      )
      if (openDays.length === 0) return false
      return openDays.every((entry) => {
        const opens = String(entry.opens ?? "").slice(0, 5)
        const closes = String(entry.closes ?? "").slice(0, 5)
        return (
          timePattern.test(opens) && timePattern.test(closes) && opens < closes
        )
      })
    }
  ),
})

function valuesFrom(restaurant: PlatformRestaurant): EditValues {
  const stored = new Map(
    (restaurant.openingHours ?? []).map((hours) => [hours.day, hours])
  )
  return {
    name: restaurant.name,
    description: restaurant.description ?? "",
    address: restaurant.address ?? "",
    city: restaurant.city ?? "",
    region: restaurant.region ?? "",
    defaultDiningType: restaurant.defaultDiningType ?? "TAKEAWAY",
    openingHours: WEEKDAYS.map((day) => {
      const hours = stored.get(day)
      return {
        day,
        closed: hours?.closed ?? day === "sunday",
        opens: hours?.opens?.slice(0, 5) || "09:00",
        closes: hours?.closes?.slice(0, 5) || "22:00",
      }
    }),
    businessRegistrationNumber:
      restaurant.compliance?.businessRegistrationNumber ?? "",
    tin: restaurant.compliance?.tin ?? "",
    foodHygienePermit: restaurant.compliance?.foodHygienePermit ?? "",
    districtAssemblyPermit: restaurant.compliance?.districtAssemblyPermit ?? "",
    notes: restaurant.compliance?.notes ?? "",
  }
}

export function RestaurantEditModal({
  restaurantId,
  onClose,
  onSaved,
}: {
  restaurantId: string
  onClose: () => void
  onSaved: () => Promise<void> | void
}) {
  const {
    data,
    loading: loadingRestaurant,
    error,
  } = useQuery<
    { platformRestaurant: { restaurant: PlatformRestaurant } },
    { id: string }
  >(RESTAURANT_DETAIL_QUERY, {
    variables: { id: restaurantId },
    context: opsAuthContext(),
  })
  const restaurant = data?.platformRestaurant.restaurant
  const [formError, setFormError] = useState<string | null>(null)
  const [updateRestaurant, { loading }] = useMutation(UPDATE_RESTAURANT, {
    context: opsAuthContext(),
  })
  const regions =
    restaurant?.region &&
    !GHANA_REGIONS.includes(restaurant.region as (typeof GHANA_REGIONS)[number])
      ? [restaurant.region, ...GHANA_REGIONS]
      : [...GHANA_REGIONS]

  return (
    <OpsModal
      wide
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Edit restaurant"
      description="Update the name, location, hours, order type, and compliance records."
      footer={
        <>
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-restaurant"
            disabled={loading || !restaurant}
          >
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      {loadingRestaurant && (
        <p className="mt-5 text-sm text-muted-foreground">Loading details…</p>
      )}
      {error && (
        <p className="mt-5 text-sm text-destructive">
          Couldn’t load restaurant details.
        </p>
      )}
      {restaurant && (
        <Form
          id="edit-restaurant"
          className="mt-5 space-y-5"
          initialValues={valuesFrom(restaurant)}
          validationSchema={editSchema}
          onSubmit={async (values) => {
            try {
              setFormError(null)
              const result = await updateRestaurant({
                variables: {
                  id: restaurant.id,
                  input: {
                    name: values.name.trim(),
                    description: values.description.trim() || null,
                    address: values.address.trim(),
                    city: values.city.trim(),
                    region: values.region,
                    defaultDiningType: values.defaultDiningType,
                    openingHours: values.openingHours.map((row) => ({
                      day: row.day,
                      closed: row.closed,
                      opens: row.closed ? null : row.opens,
                      closes: row.closed ? null : row.closes,
                    })),
                    compliance: {
                      businessRegistrationNumber:
                        values.businessRegistrationNumber.trim() || null,
                      tin: values.tin.trim() || null,
                      foodHygienePermit:
                        values.foodHygienePermit.trim() || null,
                      districtAssemblyPermit:
                        values.districtAssemblyPermit.trim() || null,
                      notes: values.notes.trim() || null,
                    },
                  },
                },
              })
              if (!result.data)
                throw new Error("Could not save restaurant details.")
              await onSaved()
            } catch (mutationError) {
              setFormError(
                mutationMessage(
                  mutationError,
                  "Could not save restaurant details."
                )
              )
            }
          }}
        >
          {(formik) => (
            <EditFields
              formik={formik}
              regions={regions}
              formError={formError}
            />
          )}
        </Form>
      )}
    </OpsModal>
  )
}

function EditFields({
  formik,
  regions,
  formError,
}: {
  formik: FormikProps<EditValues>
  regions: string[]
  formError: string | null
}) {
  const nameError = fieldError(formik, "name")
  const addressError = fieldError(formik, "address")
  const cityError = fieldError(formik, "city")
  const regionError = fieldError(formik, "region")
  const hoursError =
    formik.submitCount > 0 && typeof formik.errors.openingHours === "string"
      ? formik.errors.openingHours
      : undefined

  return (
    <>
      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}
      <Field data-invalid={Boolean(nameError)}>
        <FieldLabel htmlFor="edit-name">Name</FieldLabel>
        <Input
          id="edit-name"
          name="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          aria-invalid={Boolean(nameError)}
        />
        <FieldError>{nameError}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="edit-description">Description</FieldLabel>
        <Textarea
          id="edit-description"
          name="description"
          value={formik.values.description}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(addressError)} className="sm:col-span-2">
          <FieldLabel htmlFor="edit-address">Address</FieldLabel>
          <Input
            id="edit-address"
            name="address"
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={Boolean(addressError)}
          />
          <FieldError>{addressError}</FieldError>
        </Field>
        <Field data-invalid={Boolean(cityError)}>
          <FieldLabel htmlFor="edit-city">City</FieldLabel>
          <Input
            id="edit-city"
            name="city"
            value={formik.values.city}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={Boolean(cityError)}
          />
          <FieldError>{cityError}</FieldError>
        </Field>
        <Field data-invalid={Boolean(regionError)}>
          <FieldLabel>Region</FieldLabel>
          <Select
            value={formik.values.region}
            onValueChange={(value) =>
              void formik.setFieldValue("region", value ?? "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{regionError}</FieldError>
        </Field>
      </div>
      <Field>
        <FieldLabel>Default order type</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["TAKEAWAY", "Takeaway"],
              ["DINE_IN", "Dine in"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={formik.values.defaultDiningType === value}
              onClick={() =>
                void formik.setFieldValue("defaultDiningType", value)
              }
              className="rounded-lg border bg-background px-3 py-2.5 text-left text-sm font-medium data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/5"
              data-selected={formik.values.defaultDiningType === value}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      <Field data-invalid={Boolean(hoursError)}>
        <FieldLabel>Opening times</FieldLabel>
        <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
          {formik.values.openingHours.map((row, index) => (
            <li
              key={row.day}
              className="grid items-center gap-3 px-3 py-2.5 sm:grid-cols-[8rem_auto_1fr_1fr]"
            >
              <span className="text-sm font-medium">{dayLabels[row.day]}</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={!row.closed}
                  onCheckedChange={(open) => {
                    const next = formik.values.openingHours.map(
                      (entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, closed: !open }
                          : entry
                    )
                    void formik.setFieldValue("openingHours", next)
                  }}
                  aria-label={`${dayLabels[row.day]} is open`}
                />
                {row.closed ? "Closed" : "Open"}
              </label>
              <Input
                type="time"
                aria-label={`${dayLabels[row.day]} opens`}
                value={row.opens}
                disabled={row.closed}
                onChange={(event) =>
                  updateHour(formik, index, { opens: event.target.value })
                }
              />
              <Input
                type="time"
                aria-label={`${dayLabels[row.day]} closes`}
                value={row.closes}
                disabled={row.closed}
                onChange={(event) =>
                  updateHour(formik, index, { closes: event.target.value })
                }
              />
            </li>
          ))}
        </ul>
        <FieldError>{hoursError}</FieldError>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <ComplianceField
          formik={formik}
          name="businessRegistrationNumber"
          label="Business registration"
        />
        <ComplianceField formik={formik} name="tin" label="GRA TIN" />
        <ComplianceField
          formik={formik}
          name="foodHygienePermit"
          label="Food hygiene permit"
        />
        <ComplianceField
          formik={formik}
          name="districtAssemblyPermit"
          label="District assembly permit"
        />
      </div>
      <Field>
        <FieldLabel htmlFor="edit-notes">Compliance notes</FieldLabel>
        <Textarea
          id="edit-notes"
          name="notes"
          value={formik.values.notes}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
      </Field>
    </>
  )
}

function updateHour(
  formik: FormikProps<EditValues>,
  index: number,
  patch: Partial<HourRow>
) {
  const next = formik.values.openingHours.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, ...patch } : entry
  )
  void formik.setFieldValue("openingHours", next)
}

function ComplianceField({
  formik,
  name,
  label,
}: {
  formik: FormikProps<EditValues>
  name:
    | "businessRegistrationNumber"
    | "tin"
    | "foodHygienePermit"
    | "districtAssemblyPermit"
  label: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={`edit-${name}`}>{label}</FieldLabel>
      <Input
        id={`edit-${name}`}
        name={name}
        value={formik.values[name]}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
      />
    </Field>
  )
}
