import { useEffect, useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { ArrowLeftIcon, ArrowRightIcon, ImageIcon } from "@phosphor-icons/react"
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
import { uploadStaffAvatar } from "@/features/staff/avatar-upload"
import {
  COMPLETE_STAFF_AVATAR,
  CREATE_STAFF,
  STAFF_QUERY,
  roleLabels,
} from "@/features/staff/model"
import type { StaffData, StaffRole } from "@/features/staff/model"
import { StaffAvatar } from "@/features/staff/staff-avatar"

const teamRoles = (Object.keys(roleLabels) as StaffRole[]).filter(
  (role) => role !== "OWNER"
)

const staffValues = { name: "", role: "CASHIER" as StaffRole }

const staffSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, "Enter the staff member's name.")
    .required("Enter the staff member's name."),
  role: Yup.string().oneOf(teamRoles).required(),
})

export function OnboardingStaffStep({
  onBack,
  onContinue,
}: {
  onBack?: () => void
  onContinue: () => void
}) {
  const { data, refetch } = useQuery<StaffData>(STAFF_QUERY)
  const [createStaff, createState] = useMutation<
    { createStaff: { id: string } },
    { input: { name: string; role: StaffRole } }
  >(CREATE_STAFF)
  const [completeUpload] = useMutation(COMPLETE_STAFF_AVATAR)
  const [photo, setPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const staff = (data?.staff ?? []).filter((member) => member.role !== "OWNER")

  async function addStaff(
    values: typeof staffValues,
    helpers: { resetForm: () => void }
  ) {
    try {
      setError(null)
      const result = await createStaff({
        variables: { input: { name: values.name.trim(), role: values.role } },
      })
      const staffId = result.data?.createStaff.id
      if (!staffId) throw new Error("The staff profile was not created.")
      const pendingPhoto = photo
      helpers.resetForm()
      setPhoto(null)
      if (pendingPhoto) {
        try {
          await uploadStaffAvatar(
            (variables) => completeUpload({ variables }),
            staffId,
            pendingPhoto
          )
        } catch (uploadError) {
          await refetch()
          setError(
            uploadError instanceof Error
              ? `${uploadError.message} The profile was still added.`
              : "The profile was added, but the photo did not upload."
          )
          return
        }
      }
      await refetch()
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not add that staff profile."
      )
    }
  }

  return (
    <div className="mt-7">
      <Form
        className="space-y-4"
        initialValues={staffValues}
        validationSchema={staffSchema}
        onSubmit={addStaff}
      >
        {(formik) => {
          const nameError = fieldError(formik, "name")
          return (
            <>
              <div className="flex items-center gap-3">
                <StaffAvatar
                  name={formik.values.name || "Staff"}
                  url={previewUrl}
                  className="size-12 text-sm"
                />
                <div>
                  <input
                    id="onboarding-staff-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      setPhoto(event.target.files?.[0] ?? null)
                      event.currentTarget.value = ""
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("onboarding-staff-photo")?.click()
                    }
                  >
                    <ImageIcon data-icon="inline-start" />
                    {photo ? "Change photo" : "Add photo"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="onboarding-staff-name">Name</FieldLabel>
                  <Input
                    id="onboarding-staff-name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Kwame Boateng"
                    aria-invalid={Boolean(nameError)}
                  />
                  <FieldError>{nameError}</FieldError>
                </Field>
                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <Select
                    value={formik.values.role}
                    onValueChange={(value) =>
                      void formik.setFieldValue(
                        "role",
                        (value) ?? "CASHIER"
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamRoles.map((value) => (
                        <SelectItem key={value} value={value}>
                          {roleLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button type="submit" disabled={createState.loading}>
                  {createState.loading ? "Adding…" : "Add"}
                </Button>
              </div>
            </>
          )
        }}
      </Form>
      {error && <FieldError className="mt-3">{error}</FieldError>}
      <p className="mt-4 text-sm text-muted-foreground">
        You don’t set their PIN. Each person chooses one the first time they tap
        their profile on the till.
      </p>
      <ul className="mt-4 divide-y divide-border rounded-lg border">
        {staff.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            No extra staff yet. You can continue and add them later, or add the
            counter and kitchen team now.
          </li>
        ) : (
          staff.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <StaffAvatar
                name={member.name}
                url={member.avatarUrl}
                className="size-9 text-xs"
              />
              <span className="text-sm">
                <span className="font-medium">{member.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {roleLabels[member.role]}
                </span>
              </span>
            </li>
          ))
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
        <Button type="button" className="min-w-32" onClick={onContinue}>
          {staff.length === 0 ? "Skip for now" : "Continue"}
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
