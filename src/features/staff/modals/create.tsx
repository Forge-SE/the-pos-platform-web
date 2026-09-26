import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { ImageIcon, PlusIcon, WarningCircleIcon } from "@phosphor-icons/react"
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
  readableStaffError,
  roleLabels,
} from "@/features/staff/model"
import type { StaffRole } from "@/features/staff/model"
import { StaffAvatar } from "@/features/staff/staff-avatar"

import { StaffDialog } from "./staff-dialog"

const createStaffValues = { name: "", role: "CASHIER" as StaffRole }

const createStaffSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, "Enter the staff member's name.")
    .required("Enter the staff member's name."),
  role: Yup.string().oneOf(Object.keys(roleLabels)).required(),
})

export function CreateStaffDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [createStaff, createState] = useMutation<
    { createStaff: { id: string } },
    { input: { name: string; role: StaffRole } }
  >(CREATE_STAFF)
  const [completeUpload] = useMutation(COMPLETE_STAFF_AVATAR)
  const [photo, setPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function resetForm(helpers?: { resetForm: () => void }) {
    helpers?.resetForm()
    setPhoto(null)
    setCreatedId(null)
    setFormError(null)
  }

  async function submit(
    values: typeof createStaffValues,
    helpers: { resetForm: () => void },
  ) {
    try {
      setFormError(null)
      let staffId = createdId
      if (!staffId) {
        const result = await createStaff({
          variables: { input: { name: values.name.trim(), role: values.role } },
        })
        staffId = result.data?.createStaff?.id ?? null
        if (!staffId) throw new Error("The staff profile was not created.")
        setCreatedId(staffId)
      }
      if (photo) {
        await uploadStaffAvatar(
          (variables) => completeUpload({ variables }),
          staffId,
          photo,
        )
      }
      resetForm(helpers)
      onCreated()
    } catch (mutationError) {
      setFormError(readableStaffError(mutationError))
    }
  }

  return (
    <StaffDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (createdId) onCreated()
          setPhoto(null)
          setCreatedId(null)
          setFormError(null)
        }
        onOpenChange(next)
      }}
      title="Add staff"
      description="They'll choose their own PIN the first time they sign in."
      footer={
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
            form="create-staff-form"
            disabled={createState.loading}
          >
            <PlusIcon data-icon="inline-start" />
            {createState.loading
              ? "Adding…"
              : createdId
                ? "Save photo"
                : "Add staff"}
          </Button>
        </div>
      }
    >
      <Form
        key={String(open)}
        id="create-staff-form"
        className="space-y-5"
        initialValues={createStaffValues}
        validationSchema={createStaffSchema}
        onSubmit={submit}
      >
        {(formik) => {
          const nameError = fieldError(formik, "name")
          return (
            <>
        <div className="flex items-center gap-4">
          <StaffAvatar
            name={formik.values.name || "New staff"}
            url={previewUrl}
            className="size-16 text-base"
          />
          <div>
            <input
              id="staff-photo"
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
              onClick={() => document.getElementById("staff-photo")?.click()}
            >
              <ImageIcon data-icon="inline-start" />
              {photo ? "Change photo" : "Add photo"}
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              JPEG, PNG, or WebP. Optional, up to 5 MB.
            </p>
          </div>
        </div>

        <Field data-invalid={Boolean(nameError)}>
          <FieldLabel htmlFor="staff-name">Name</FieldLabel>
          <Input
            id="staff-name"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Ama Mensah"
            autoComplete="off"
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
                (value as StaffRole | null) ?? "CASHIER",
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {formError && (
          <FieldError className="flex items-start gap-2">
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
            {formError}
          </FieldError>
        )}
            </>
          )
        }}
      </Form>
    </StaffDialog>
  )
}
