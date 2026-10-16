import { useId } from "react"
import { useField } from "formik"
import * as Yup from "yup"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  parsePreparationTime,
  PREPARATION_TIME_ERROR,
} from "@/lib/preparation-time"

export const preparationTimeSchema = {
  preparationTime: Yup.string().test(
    "preparation-time",
    PREPARATION_TIME_ERROR,
    (value, context) => {
      const parent = context.parent as { preparationTimeUnit: string }
      return (
        parsePreparationTime(value ?? "", parent.preparationTimeUnit) !==
        undefined
      )
    }
  ),
  preparationTimeUnit: Yup.string().oneOf(["minutes", "hours"]).required(),
}

export function PreparationTimeField() {
  const id = useId()
  const [duration, meta] = useField<string>("preparationTime")
  const [unit, , helpers] = useField<string>("preparationTimeUnit")
  const error = meta.touched ? meta.error : undefined
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>Usual preparation time</FieldLabel>
      <div className="flex max-w-sm gap-2">
        <Input
          {...duration}
          id={id}
          inputMode="decimal"
          placeholder="e.g. 20"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`}
          className="min-w-0 flex-1"
        />
        <Select
          value={unit.value}
          onValueChange={(value) => {
            void helpers
              .setValue(value ?? "minutes")
              .then(() => helpers.setTouched(true))
          }}
        >
          <SelectTrigger className="w-32" aria-label="Preparation time unit">
            <SelectValue>
              {(value) => (value === "hours" ? "Hours" : "Minutes")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <FieldDescription id={`${id}-description`}>
        Optional estimate per meal, not a promised ready time. Enter 0 for ready
        to serve; maximum 24 hours.
      </FieldDescription>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}
