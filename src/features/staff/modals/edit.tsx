import { Dialog } from "@base-ui/react/dialog"
import { WarningCircleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { roleLabels } from "@/features/staff/model"
import type { StaffMember } from "@/features/staff/model"

import { StaffDialog } from "./staff-dialog"

export function EditStaffDialog({
  member,
  open,
  onOpenChange,
}: {
  member: StaffMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <StaffDialog
      open={open}
      onOpenChange={onOpenChange}
      title={member ? `Edit ${member.name}` : "Edit staff"}
      description="Staff account details."
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
          <Field>
            <FieldLabel htmlFor="edit-staff-name">Name</FieldLabel>
            <Input
              id="edit-staff-name"
              value={member.name}
              disabled
              readOnly
            />
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
            Editing staff accounts isn&apos;t supported by the API yet. Staff
            records are read-only after creation.
          </p>
        </div>
      )}
    </StaffDialog>
  )
}
