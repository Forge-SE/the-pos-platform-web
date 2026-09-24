import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation } from "@apollo/client/react"
import { Dialog } from "@base-ui/react/dialog"
import { PlusIcon, WarningCircleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PinInput } from "@/components/ui/pin-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CREATE_STAFF,
  readableStaffError,
  roleLabels,
} from "@/features/staff/model"
import type { StaffRole } from "@/features/staff/model"

import { StaffDialog } from "./staff-dialog"

export function CreateStaffDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [createStaff, createState] = useMutation(CREATE_STAFF)
  const [name, setName] = useState("")
  const [role, setRole] = useState<StaffRole>("CASHIER")
  const [pin, setPin] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  function resetForm() {
    setName("")
    setRole("CASHIER")
    setPin("")
    setFormError(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setFormError("Enter the staff member's name.")
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setFormError("PIN must contain exactly four digits.")
      return
    }
    try {
      setFormError(null)
      await createStaff({
        variables: { input: { name: name.trim(), role, pin } },
      })
      resetForm()
      onCreated()
    } catch (mutationError) {
      setFormError(readableStaffError(mutationError))
    }
  }

  return (
    <StaffDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
      title="Create staff account"
      description="Each person needs a unique four-digit PIN for this restaurant."
      footer={
        <div className="flex justify-end gap-2">
          <Dialog.Close
            render={
              <Button type="button" variant="outline">
                Cancel
              </Button>
            }
          />
          <Button type="submit" form="create-staff-form" disabled={createState.loading}>
            <PlusIcon data-icon="inline-start" />
            {createState.loading ? "Creating…" : "Create staff account"}
          </Button>
        </div>
      }
    >
      <form
        id="create-staff-form"
        className="space-y-5"
        onSubmit={submit}
      >
        <Field>
          <FieldLabel htmlFor="staff-name">Name</FieldLabel>
          <Input
            id="staff-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ama Mensah"
            autoComplete="off"
          />
        </Field>

        <Field>
          <FieldLabel>Role</FieldLabel>
          <Select
            value={role}
            onValueChange={(value) =>
              setRole((value as StaffRole | null) ?? "CASHIER")
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

        <Field>
          <FieldLabel htmlFor="staff-pin">Four-digit PIN</FieldLabel>
          <div className="flex justify-start">
            <PinInput
              id="staff-pin"
              value={pin}
              onChange={(value) => setPin(value.replace(/\D/g, ""))}
              invalid={Boolean(formError && !/^\d{4}$/.test(pin))}
              autoComplete="new-password"
            />
          </div>
        </Field>

        {formError && (
          <FieldError className="flex items-start gap-2">
            <WarningCircleIcon className="mt-0.5 size-4 shrink-0" />
            {formError}
          </FieldError>
        )}
      </form>
    </StaffDialog>
  )
}
