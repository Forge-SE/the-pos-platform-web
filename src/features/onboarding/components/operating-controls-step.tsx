import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { OnboardingStepProps } from "./step-types"

export function OperatingControlsStep({
  values,
  errors,
  updateField,
  hideSetupSecret = false,
}: OnboardingStepProps & { hideSetupSecret?: boolean }) {
  return (
    <FieldGroup className="gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.managerDiscountThresholdPercent)}>
          <FieldLabel htmlFor="discount-threshold">
            Manager approval threshold
          </FieldLabel>
          <div className="relative">
            <Input
              id="discount-threshold"
              type="number"
              value={values.managerDiscountThresholdPercent}
              onChange={(event) =>
                updateField(
                  "managerDiscountThresholdPercent",
                  event.target.value
                )
              }
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              className="pr-10 tabular-nums"
              aria-invalid={Boolean(errors.managerDiscountThresholdPercent)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              %
            </span>
          </div>
          <FieldDescription>
            Discounts above this need a manager.
          </FieldDescription>
          <FieldError>{errors.managerDiscountThresholdPercent}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.reconciliationVarianceGhs)}>
          <FieldLabel htmlFor="variance-threshold">
            Cash variance alert
          </FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              GHS
            </span>
            <Input
              id="variance-threshold"
              type="number"
              value={values.reconciliationVarianceGhs}
              onChange={(event) =>
                updateField("reconciliationVarianceGhs", event.target.value)
              }
              min="0"
              step="0.01"
              inputMode="decimal"
              className="pl-12 tabular-nums"
              aria-invalid={Boolean(errors.reconciliationVarianceGhs)}
            />
          </div>
          <FieldDescription>
            Flag differences above this amount.
          </FieldDescription>
          <FieldError>{errors.reconciliationVarianceGhs}</FieldError>
        </Field>
      </div>

      {hideSetupSecret ? null : (
        <Field data-invalid={Boolean(errors.setupSecret)}>
          <FieldLabel htmlFor="setup-secret">Setup access code</FieldLabel>
          <Input
            id="setup-secret"
            type="password"
            value={values.setupSecret}
            onChange={(event) => updateField("setupSecret", event.target.value)}
            autoComplete="off"
            placeholder="Provided by your platform administrator"
            aria-invalid={Boolean(errors.setupSecret)}
            aria-describedby="setup-secret-description setup-secret-error"
          />
          <FieldDescription id="setup-secret-description">
            This private code authorizes creation of a new restaurant.
          </FieldDescription>
          <FieldError id="setup-secret-error">{errors.setupSecret}</FieldError>
        </Field>
      )}
    </FieldGroup>
  )
}
