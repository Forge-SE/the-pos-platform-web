import { useState } from "react"
import { useMutation } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import {
  ImageIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { uploadStaffAvatar } from "@/features/staff/avatar-upload"
import { COMPLETE_STAFF_AVATAR, roleLabels } from "@/features/staff/model"
import type { StaffMember } from "@/features/staff/model"
import { StaffAvatar } from "@/features/staff/staff-avatar"

import { StaffDialog } from "./staff-dialog"

export function EditStaffDialog({
  member,
  open,
  onOpenChange,
  onUpdated,
}: {
  member: StaffMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}) {
  const [completeUpload] = useMutation(COMPLETE_STAFF_AVATAR)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function changePhoto(file: File) {
    if (!member) return
    try {
      setUploading(true)
      setFormError(null)
      await uploadStaffAvatar(
        (variables) => completeUpload({ variables }),
        member.id,
        file
      )
      onUpdated()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not update the photo."
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <StaffDialog
      open={open}
      onOpenChange={onOpenChange}
      title={member ? `Edit ${member.name}` : "Edit staff"}
      description="Update the photo staff see on the sign-in rail."
      footer={
        <div className="flex justify-end">
          <Dialog.Close
            render={
              <Button type="button" variant="outline">
                Close
              </Button>
            }
          />
        </div>
      }
    >
      {member && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <StaffAvatar
              name={member.name}
              url={member.avatarUrl}
              className="size-16 text-base"
            />
            <div>
              <input
                id="edit-staff-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void changePhoto(file)
                  event.currentTarget.value = ""
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() =>
                  document.getElementById("edit-staff-photo")?.click()
                }
              >
                {uploading ? (
                  <SpinnerGapIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <ImageIcon data-icon="inline-start" />
                )}
                {uploading ? "Uploading…" : "Change photo"}
              </Button>
            </div>
          </div>
          <Field>
            <FieldLabel htmlFor="edit-staff-name">Name</FieldLabel>
            <Input id="edit-staff-name" value={member.name} disabled readOnly />
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Select value={member.role} disabled>
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
          <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
            Name and role stay as they were created.{" "}
            {member.pinSet
              ? "This person already has a PIN."
              : "They'll choose a PIN the first time they sign in."}
          </p>
          {formError && (
            <FieldError className="flex items-start gap-2">
              <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
              {formError}
            </FieldError>
          )}
        </div>
      )}
    </StaffDialog>
  )
}
