import { LockKeyIcon } from "@phosphor-icons/react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PinInput } from "@/components/ui/pin-input"

import type { OnboardingStepProps } from "./step-types"

export function OwnerAccessStep({
  values,
  errors,
  updateField,
}: OnboardingStepProps) {
  return (
    <FieldGroup className="gap-5">
      <Field data-invalid={Boolean(errors.ownerName)}>
        <FieldLabel htmlFor="owner-name">Owner name</FieldLabel>
        <Input
          id="owner-name"
          value={values.ownerName}
          onChange={(event) => updateField("ownerName", event.target.value)}
          autoComplete="name"
          placeholder="Full name"
          aria-invalid={Boolean(errors.ownerName)}
          aria-describedby={errors.ownerName ? "owner-name-error" : undefined}
          autoFocus
        />
        <FieldError id="owner-name-error">{errors.ownerName}</FieldError>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.ownerPin)}>
          <FieldLabel htmlFor="owner-pin">Four-digit PIN</FieldLabel>
          <PinInput
            id="owner-pin"
            value={values.ownerPin}
            onChange={(value) => updateField("ownerPin", value)}
            invalid={Boolean(errors.ownerPin)}
            autoComplete="new-password"
          />
          <FieldDescription>
            Used for owner access at the till.
          </FieldDescription>
          <FieldError>{errors.ownerPin}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.confirmOwnerPin)}>
          <FieldLabel htmlFor="confirm-owner-pin">Confirm PIN</FieldLabel>
          <PinInput
            id="confirm-owner-pin"
            value={values.confirmOwnerPin}
            onChange={(value) => updateField("confirmOwnerPin", value)}
            invalid={Boolean(errors.confirmOwnerPin)}
            autoComplete="new-password"
          />
          <FieldDescription>Enter the same four digits.</FieldDescription>
          <FieldError>{errors.confirmOwnerPin}</FieldError>
        </Field>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
        <LockKeyIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
        <p>
          Staff members get separate PINs later. PINs are stored as secure
          hashes by the core service.
        </p>
      </div>
    </FieldGroup>
  )
}
