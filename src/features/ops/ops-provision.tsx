import { useState } from "react"
import type { FormikProps } from "formik"
import { useMutation } from "@apollo/client/react"
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
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
import { OpsHeader } from "@/features/ops/ops-shell"
import {
  GHANA_REGIONS,
  SETUP_RESTAURANT,
  WEEKDAYS,
} from "@/features/ops/ops-model"
import type { DayHours } from "@/features/ops/ops-model"
import { restaurantSlug } from "@/features/onboarding/onboarding-contract"
import { opsAuthContext } from "@/lib/ops-token"

const steps = ["Restaurant details", "Admin", "Compliance"]

const provisionValues = {
  name: "",
  description: "",
  slug: "",
  address: "",
  city: "",
  region: "",
  defaultDiningType: "TAKEAWAY" as "DINE_IN" | "TAKEAWAY",
  openingHours: WEEKDAYS.map((day) => ({
    day,
    closed: day === "sunday",
    opens: "09:00",
    closes: "22:00",
  })),
  ownerName: "",
  ownerPin: "",
  confirmOwnerPin: "",
  businessRegistrationNumber: "",
  tin: "",
  foodHygienePermit: "",
  districtAssemblyPermit: "",
  complianceNotes: "",
}

type ProvisionValues = typeof provisionValues

const timePattern = /^([01]\d|2[0-3]):[0-5]\d/

function hoursAreValid(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return false
  const openDays = value.filter(
    (entry) => entry && typeof entry === "object" && !entry.closed,
  )
  if (openDays.length === 0) return false
  return openDays.every((entry) => {
    const opens = String(entry.opens ?? "").slice(0, 5)
    const closes = String(entry.closes ?? "").slice(0, 5)
    return timePattern.test(opens) && timePattern.test(closes) && opens < closes
  })
}

function schemaFor(step: number) {
  if (step === 0) {
    return Yup.object({
      name: Yup.string()
        .trim()
        .min(2, "Enter the restaurant name.")
        .required("Enter the restaurant name."),
      description: Yup.string().max(800, "Keep the description under 800 characters."),
      slug: Yup.string()
        .matches(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          "Use lowercase letters, numbers, and single hyphens.",
        )
        .required("Use lowercase letters, numbers, and single hyphens."),
      address: Yup.string()
        .trim()
        .min(4, "Enter the street address.")
        .required("Enter the street address."),
      city: Yup.string()
        .trim()
        .min(2, "Enter the city or town.")
        .required("Enter the city or town."),
      region: Yup.string().required("Choose a region."),
      defaultDiningType: Yup.string().oneOf(["DINE_IN", "TAKEAWAY"]).required(),
      openingHours: Yup.array().test(
        "hours",
        "Keep at least one day open, and make sure closing is later than opening.",
        hoursAreValid,
      ),
    })
  }
  if (step === 1) {
    return Yup.object({
      ownerName: Yup.string()
        .trim()
        .min(2, "Enter the admin’s name.")
        .required("Enter the admin’s name."),
      ownerPin: Yup.string()
        .matches(/^\d{4}$/, "Enter a four-digit PIN.")
        .required("Enter a four-digit PIN."),
      confirmOwnerPin: Yup.string()
        .required("The PINs do not match.")
        .oneOf([Yup.ref("ownerPin")], "The PINs do not match."),
    })
  }
  return Yup.object({})
}

const dayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

export function OpsProvision() {
  const [step, setStep] = useState(0)
  const [slugEdited, setSlugEdited] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [created, setCreated] = useState<{
    name: string
    code: string
    ownerName: string
  } | null>(null)
  const [setupRestaurant, { loading }] = useMutation<
    {
      platformSetupRestaurant: {
        restaurant: { name: string; code: string }
        user: { name: string }
      }
    },
    { input: Record<string, unknown> }
  >(SETUP_RESTAURANT)

  async function createRestaurant(values: ProvisionValues, includeCompliance: boolean) {
    try {
      setApiError(null)
      const result = await setupRestaurant({
        variables: {
          input: {
            name: values.name.trim(),
            slug: values.slug.trim(),
            ownerName: values.ownerName.trim(),
            ownerPin: values.ownerPin,
            defaultDiningType: values.defaultDiningType,
            description: values.description.trim() || null,
            address: values.address.trim(),
            city: values.city.trim(),
            region: values.region,
            openingHours: values.openingHours.map((row) => ({
              day: row.day,
              closed: row.closed,
              opens: row.closed ? null : row.opens.slice(0, 5),
              closes: row.closed ? null : row.closes.slice(0, 5),
            })),
            compliance: includeCompliance
              ? {
                  businessRegistrationNumber:
                    values.businessRegistrationNumber.trim() || null,
                  tin: values.tin.trim() || null,
                  foodHygienePermit: values.foodHygienePermit.trim() || null,
                  districtAssemblyPermit:
                    values.districtAssemblyPermit.trim() || null,
                  notes: values.complianceNotes.trim() || null,
                }
              : null,
          },
        },
        context: opsAuthContext(),
      })
      const payload = result.data?.platformSetupRestaurant
      if (!payload) throw new Error("The restaurant was not created.")
      setCreated({
        name: payload.restaurant.name,
        code: payload.restaurant.code,
        ownerName: payload.user.name,
      })
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "We couldn’t create the restaurant. Try again.",
      )
    }
  }

  if (created) {
    return (
      <>
        <OpsHeader
          title="Restaurant added"
          description="Share the login code with the restaurant admin. They choose their team’s PINs later."
        />
        <section className="mx-4 mb-8 rounded-xl border border-border/70 bg-card p-6 lg:mx-8">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircleIcon className="size-6" weight="fill" />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-[-0.025em]">
            {created.name} is ready
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin: {created.ownerName}. Login code{" "}
            <code className="font-mono font-semibold text-foreground">
              {created.code}
            </code>
          </p>
          <Button className="mt-6" render={<Link to="/ops" />}>
            Back to restaurants
          </Button>
        </section>
      </>
    )
  }

  return (
    <>
      <OpsHeader
        title="Add restaurant"
        description="Capture the workspace, the person who administers it, and any Ghana compliance records you already have."
      />
      <section className="mx-4 mb-8 rounded-xl border border-border/70 bg-card p-5 sm:p-8 lg:mx-8">
        <ol className="grid w-full grid-cols-3" aria-label="Progress">
          {steps.map((label, index) => {
            const stepNumber = index + 1
            const state = stepNumber < step + 1 ? "done" : stepNumber === step + 1 ? "now" : "next"
            const align =
              index === 0
                ? "items-start text-left"
                : index === steps.length - 1
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
                    {state === "done" ? (
                      <CheckCircleIcon className="size-3.5" weight="fill" />
                    ) : (
                      stepNumber
                    )}
                  </span>
                  {index < steps.length - 1 && (
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

        {apiError && (
          <p role="alert" className="mt-6 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {apiError}
          </p>
        )}

        <Form
          className="mt-8"
          initialValues={provisionValues}
          validationSchema={schemaFor(step)}
          onSubmit={async (values) => {
            if (step < 2) {
              setStep((current) => current + 1)
              return
            }
            await createRestaurant(values, true)
          }}
        >
          {(formik) => (
            <>
              {step === 0 && (
                <DetailsStep
                  formik={formik}
                  slugEdited={slugEdited}
                  onSlugEdited={() => setSlugEdited(true)}
                />
              )}
              {step === 1 && <AdminStep formik={formik} />}
              {step === 2 && <ComplianceStep formik={formik} />}

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/70 pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  className={step === 0 ? "invisible" : undefined}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={loading}
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back
                </Button>
                <div className="flex gap-2">
                  {step === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => void createRestaurant(formik.values, false)}
                    >
                      Skip for now
                    </Button>
                  )}
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      "Creating…"
                    ) : step === 2 ? (
                      "Create restaurant"
                    ) : (
                      <>
                        Continue
                        <ArrowRightIcon data-icon="inline-end" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Form>
      </section>
    </>
  )
}

function DetailsStep({
  formik,
  slugEdited,
  onSlugEdited,
}: {
  formik: FormikProps<ProvisionValues>
  slugEdited: boolean
  onSlugEdited: () => void
}) {
  const nameError = fieldError(formik, "name")
  const slugError = fieldError(formik, "slug")
  const addressError = fieldError(formik, "address")
  const cityError = fieldError(formik, "city")
  const regionError = fieldError(formik, "region")
  const hoursError =
    typeof formik.errors.openingHours === "string" &&
    (formik.submitCount > 0 || formik.touched.openingHours)
      ? formik.errors.openingHours
      : undefined

  return (
    <div className="space-y-5">
      <Field data-invalid={Boolean(nameError)}>
        <FieldLabel htmlFor="restaurant-name">Restaurant name</FieldLabel>
        <Input
          id="restaurant-name"
          name="name"
          value={formik.values.name}
          onChange={(event) => {
            formik.handleChange(event)
            if (!slugEdited) {
              void formik.setFieldValue("slug", restaurantSlug(event.target.value))
            }
          }}
          onBlur={formik.handleBlur}
          placeholder="Ama’s Kitchen"
          aria-invalid={Boolean(nameError)}
        />
        <FieldError>{nameError}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="restaurant-description">Description</FieldLabel>
        <Textarea
          id="restaurant-description"
          name="description"
          value={formik.values.description}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="What guests should know about the restaurant"
        />
      </Field>
      <Field data-invalid={Boolean(slugError)}>
        <FieldLabel htmlFor="restaurant-slug">Workspace URL</FieldLabel>
        <Input
          id="restaurant-slug"
          name="slug"
          value={formik.values.slug}
          onChange={(event) => {
            onSlugEdited()
            void formik.setFieldValue("slug", restaurantSlug(event.target.value))
          }}
          onBlur={formik.handleBlur}
          aria-invalid={Boolean(slugError)}
        />
        <FieldError>{slugError}</FieldError>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(addressError)} className="sm:col-span-2">
          <FieldLabel htmlFor="restaurant-address">Address</FieldLabel>
          <Input
            id="restaurant-address"
            name="address"
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="14 Oxford Street, Osu"
            aria-invalid={Boolean(addressError)}
          />
          <FieldError>{addressError}</FieldError>
        </Field>
        <Field data-invalid={Boolean(cityError)}>
          <FieldLabel htmlFor="restaurant-city">City</FieldLabel>
          <Input
            id="restaurant-city"
            name="city"
            value={formik.values.city}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Accra"
            aria-invalid={Boolean(cityError)}
          />
          <FieldError>{cityError}</FieldError>
        </Field>
        <Field data-invalid={Boolean(regionError)}>
          <FieldLabel>Region</FieldLabel>
          <Select
            value={formik.values.region}
            onValueChange={(value) => void formik.setFieldValue("region", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose region" />
            </SelectTrigger>
            <SelectContent>
              {GHANA_REGIONS.map((region) => (
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
              onClick={() => void formik.setFieldValue("defaultDiningType", value)}
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
                    const next = formik.values.openingHours.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, closed: !open } : entry,
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
                onChange={(event) => updateHour(formik, index, { opens: event.target.value })}
              />
              <Input
                type="time"
                aria-label={`${dayLabels[row.day]} closes`}
                value={row.closes}
                disabled={row.closed}
                onChange={(event) => updateHour(formik, index, { closes: event.target.value })}
              />
            </li>
          ))}
        </ul>
        <FieldError>{hoursError}</FieldError>
      </Field>
    </div>
  )
}

function updateHour(
  formik: FormikProps<ProvisionValues>,
  index: number,
  patch: Partial<DayHours>,
) {
  const next = formik.values.openingHours.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, ...patch } : entry,
  )
  void formik.setFieldValue("openingHours", next)
}

function AdminStep({ formik }: { formik: FormikProps<ProvisionValues> }) {
  const nameError = fieldError(formik, "ownerName")
  const pinError = fieldError(formik, "ownerPin")
  const confirmError = fieldError(formik, "confirmOwnerPin")
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        This person administers the restaurant. They sign in with a four-digit PIN. Other staff choose their own PIN the first time they tap their profile.
      </p>
      <Field data-invalid={Boolean(nameError)}>
        <FieldLabel htmlFor="admin-name">Admin name</FieldLabel>
        <Input
          id="admin-name"
          name="ownerName"
          value={formik.values.ownerName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="Ama Mensah"
          aria-invalid={Boolean(nameError)}
        />
        <FieldError>{nameError}</FieldError>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(pinError)}>
          <FieldLabel htmlFor="admin-pin">PIN</FieldLabel>
          <Input
            id="admin-pin"
            name="ownerPin"
            inputMode="numeric"
            maxLength={4}
            value={formik.values.ownerPin}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={Boolean(pinError)}
          />
          <FieldError>{pinError}</FieldError>
        </Field>
        <Field data-invalid={Boolean(confirmError)}>
          <FieldLabel htmlFor="admin-pin-confirm">Confirm PIN</FieldLabel>
          <Input
            id="admin-pin-confirm"
            name="confirmOwnerPin"
            inputMode="numeric"
            maxLength={4}
            value={formik.values.confirmOwnerPin}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            aria-invalid={Boolean(confirmError)}
          />
          <FieldError>{confirmError}</FieldError>
        </Field>
      </div>
    </div>
  )
}

function ComplianceStep({ formik }: { formik: FormikProps<ProvisionValues> }) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        Optional. Ghana restaurants often keep a Registrar General certificate, a GRA TIN, a food hygiene permit, and a district assembly permit. You can skip this and add them later.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ComplianceField
          formik={formik}
          name="businessRegistrationNumber"
          label="Business registration"
          placeholder="BN-123456789"
        />
        <ComplianceField formik={formik} name="tin" label="GRA TIN" placeholder="C0012345678" />
        <ComplianceField
          formik={formik}
          name="foodHygienePermit"
          label="Food hygiene permit"
          placeholder="Permit number"
        />
        <ComplianceField
          formik={formik}
          name="districtAssemblyPermit"
          label="District assembly permit"
          placeholder="Permit number"
        />
      </div>
      <Field>
        <FieldLabel htmlFor="compliance-notes">Notes</FieldLabel>
        <Textarea
          id="compliance-notes"
          name="complianceNotes"
          value={formik.values.complianceNotes}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="Anything else on file, such as an FDA product registration"
        />
      </Field>
    </div>
  )
}

function ComplianceField({
  formik,
  name,
  label,
  placeholder,
}: {
  formik: FormikProps<ProvisionValues>
  name: "businessRegistrationNumber" | "tin" | "foodHygienePermit" | "districtAssemblyPermit"
  label: string
  placeholder: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        value={formik.values[name]}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        placeholder={placeholder}
      />
    </Field>
  )
}
