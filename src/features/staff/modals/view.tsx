import { Dialog } from "@base-ui/react/dialog"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { roleLabels } from "@/features/staff/model"
import type { StaffMember } from "@/features/staff/model"

import { StaffDialog } from "./staff-dialog"

export function ViewStaffDialog({
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
      title={member?.name ?? "Staff member"}
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
        <dl className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd>
              <Badge variant="outline">{roleLabels[member.role]}</Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {member.active ? (
                <Badge
                  variant="outline"
                  className="border-transparent bg-primary/25 text-primary-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-secondary"
                  />
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </dd>
          </div>
        </dl>
      )}
    </StaffDialog>
  )
}
