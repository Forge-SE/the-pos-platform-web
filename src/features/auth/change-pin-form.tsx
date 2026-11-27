import { useState } from "react"
import type { FormEvent } from "react"
import { gql } from "@apollo/client"
import { useMutation } from "@apollo/client/react"
import { CaretRightIcon, SpinnerGapIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { PinInput } from "@/components/ui/pin-input"
import type { RestaurantRole } from "@/lib/auth-token"

export const CHANGE_STAFF_PIN = gql`
  mutation ChangeStaffPin(
    $userId: ID!
    $currentPin: String!
    $newPin: String!
  ) {
    changeStaffPin(userId: $userId, currentPin: $currentPin, newPin: $newPin) {
      accessToken
      refreshToken
      user {
        id
        restaurantId
        name
        role
        pinChangeRequired
      }
    }
  }
`

export interface ChangePinPayload {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    restaurantId: string
    name: string
    role: RestaurantRole
    pinChangeRequired: boolean
  }
}

type PinErrors = Partial<Record<"current" | "next" | "confirm", string>>

function readableError(error: unknown) {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as { errors?: Array<{ message?: string }> }).errors
    const joined = errors
      ?.map((item) => item.message)
      .filter((message): message is string => Boolean(message))
      .join(" ")
    if (joined) return joined
  }
  return error instanceof Error ? error.message : ""
}

/**
 * Lets a signed-in person (or one who just proved their PIN) choose a new one.
 * Pass `currentPin` when it is already known, for example straight after sign-in.
 */
export function ChangePinForm({
  userId,
  currentPin,
  submitLabel = "Save new PIN",
  onChanged,
  onCancel,
  cancelLabel = "Cancel",
}: {
  userId: string
  currentPin?: string
  submitLabel?: string
  onChanged: (payload: ChangePinPayload) => void | Promise<void>
  onCancel?: () => void
  cancelLabel?: string
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<PinErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [changePin, { loading }] = useMutation<
    { changeStaffPin: ChangePinPayload },
    { userId: string; currentPin: string; newPin: string }
  >(CHANGE_STAFF_PIN)

  const askCurrent = currentPin === undefined
  const existing = currentPin ?? current

  function validate(): PinErrors {
    const found: PinErrors = {}
    if (askCurrent && !/^\d{4}$/.test(current)) {
      found.current = "Enter your current four-digit PIN."
    }
    if (!/^\d{4}$/.test(next)) found.next = "Choose a four-digit PIN."
    else if (next === existing) {
      found.next = "Choose a PIN that is different from your current one."
    }
    if (!found.next && confirm !== next)
      found.confirm = "The PINs do not match."
    return found
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    const found = validate()
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return
    try {
      const result = await changePin({
        variables: { userId, currentPin: existing, newPin: next },
      })
      const payload = result.data?.changeStaffPin
      if (!payload) throw new Error("Missing response")
      await onChanged(payload)
    } catch (error) {
      const message = readableError(error)
      if (/current PIN/i.test(message) && askCurrent) {
        setErrors({ current: message })
        setCurrent("")
      } else {
        setFormError(message || "We couldn’t save that PIN. Try again.")
      }
      setConfirm("")
    }
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      {formError && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive"
        >
          {formError}
        </div>
      )}
      <FieldGroup className="gap-5">
        {askCurrent && (
          <Field data-invalid={Boolean(errors.current)}>
            <FieldLabel htmlFor="change-pin-current">Current PIN</FieldLabel>
            <PinInput
              id="change-pin-current"
              value={current}
              onChange={(value) => {
                setCurrent(value)
                setErrors((prev) => ({ ...prev, current: undefined }))
              }}
              invalid={Boolean(errors.current)}
              autoComplete="current-password"
            />
            <FieldError>{errors.current}</FieldError>
          </Field>
        )}
        <Field data-invalid={Boolean(errors.next)}>
          <FieldLabel htmlFor="change-pin-new">New PIN</FieldLabel>
          <PinInput
            id="change-pin-new"
            value={next}
            onChange={(value) => {
              setNext(value)
              setErrors((prev) => ({ ...prev, next: undefined }))
            }}
            invalid={Boolean(errors.next)}
            autoComplete="new-password"
            autoFocus={!askCurrent}
          />
          <FieldDescription>
            Four digits only you know. Don’t share it with the team.
          </FieldDescription>
          <FieldError>{errors.next}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.confirm)}>
          <FieldLabel htmlFor="change-pin-confirm">Confirm new PIN</FieldLabel>
          <PinInput
            id="change-pin-confirm"
            value={confirm}
            onChange={(value) => {
              setConfirm(value)
              setErrors((prev) => ({ ...prev, confirm: undefined }))
            }}
            invalid={Boolean(errors.confirm)}
            autoComplete="new-password"
          />
          <FieldError>{errors.confirm}</FieldError>
        </Field>
      </FieldGroup>

      <Button type="submit" className="mt-7 w-full" disabled={loading}>
        {loading ? (
          <>
            <SpinnerGapIcon
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
              data-icon="inline-start"
            />
            Saving PIN…
          </>
        ) : (
          <>
            {submitLabel}
            <CaretRightIcon aria-hidden="true" data-icon="inline-end" />
          </>
        )}
      </Button>
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 w-full"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
      )}
    </form>
  )
}
