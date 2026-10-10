import { useState } from "react"
import { useMutation, useQuery } from "@apollo/client/react"
import { DeviceMobileIcon, TrashIcon } from "@phosphor-icons/react"
import * as Yup from "yup"

import { Button } from "@/components/ui/button"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"

import {
  ADD_MOMO_ACCOUNT,
  MOMO_ACCOUNTS_QUERY,
  MOMO_PROVIDERS,
  REMOVE_MOMO_ACCOUNT,
  momoProviderLabels,
} from "./model"
import type { MomoAccount, MomoProvider } from "./model"
import { formatGhanaPhone, normalizeGhanaPhone } from "./phone"

interface MomoData {
  momoAccounts: MomoAccount[]
}

const momoValues = {
  provider: "MTN" as MomoProvider,
  accountName: "",
  phone: "",
}

const momoSchema = Yup.object({
  provider: Yup.string().oneOf(MOMO_PROVIDERS).required(),
  accountName: Yup.string()
    .trim()
    .min(2, "Enter the name on the mobile money account.")
    .required("Enter the name on the mobile money account."),
  phone: Yup.string().test(
    "ghana-phone",
    "Enter a Ghana mobile number, for example 024 123 4567.",
    (value) => Boolean(normalizeGhanaPhone(value ?? ""))
  ),
})

export function MomoAccounts({
  embedded = false,
}: {
  /** When true, omit the settings-card chrome so onboarding can supply its own. */
  embedded?: boolean
}) {
  const profile = getAccessTokenProfile()
  const canManage = hasPermission(profile, "SETTINGS_MANAGE")
  const { data, loading, error, refetch } = useQuery<MomoData>(
    MOMO_ACCOUNTS_QUERY,
    { skip: !canManage }
  )
  const [addAccount, addState] = useMutation(ADD_MOMO_ACCOUNT)
  const [removeAccount, removeState] = useMutation(REMOVE_MOMO_ACCOUNT)
  const [formError, setFormError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const accounts = data?.momoAccounts ?? []

  async function submit(
    values: typeof momoValues,
    helpers: { resetForm: (next?: { values: typeof momoValues }) => void }
  ) {
    const normalized = normalizeGhanaPhone(values.phone)
    if (!normalized) return
    try {
      setFormError(null)
      await addAccount({
        variables: {
          input: {
            provider: values.provider,
            accountName: values.accountName.trim(),
            phone: normalized,
          },
        },
      })
      helpers.resetForm({
        values: { ...momoValues, provider: values.provider },
      })
      await refetch()
    } catch (mutationError) {
      setFormError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not save that number."
      )
    }
  }

  async function remove(id: string) {
    try {
      setRemovingId(id)
      setFormError(null)
      await removeAccount({ variables: { id } })
      await refetch()
    } catch (mutationError) {
      setFormError(
        mutationError instanceof Error
          ? mutationError.message
          : "Could not remove that number."
      )
    } finally {
      setRemovingId(null)
    }
  }

  const body = !canManage ? (
    <p className="mt-4 text-sm text-muted-foreground">
      Only managers and owners can edit payout numbers.
    </p>
  ) : error ? (
    <ErrorState
      className="mt-4"
      title="Could not load payout numbers."
      onRetry={refetch}
    />
  ) : (
    <div className="mt-5 space-y-5">
      <Form
        className="space-y-4"
        initialValues={momoValues}
        validationSchema={momoSchema}
        onSubmit={submit}
      >
        {(formik) => {
          const nameError = fieldError(formik, "accountName")
          const phoneError = fieldError(formik, "phone")
          return (
            <>
              <fieldset>
                <legend className="text-sm font-medium">Network</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {MOMO_PROVIDERS.map((value) => {
                    const selected = formik.values.provider === value
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          void formik.setFieldValue("provider", value)
                          setFormError(null)
                        }}
                        className="rounded-lg border bg-background px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/60 data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/5"
                        data-selected={selected}
                      >
                        {momoProviderLabels[value]}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="momo-account-name">
                    Account name
                  </FieldLabel>
                  <Input
                    id="momo-account-name"
                    name="accountName"
                    value={formik.values.accountName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Ama's Kitchen"
                    autoComplete="organization"
                    aria-invalid={Boolean(nameError)}
                  />
                  <FieldError>{nameError}</FieldError>
                </Field>
                <Field data-invalid={Boolean(phoneError)}>
                  <FieldLabel htmlFor="momo-phone">Mobile number</FieldLabel>
                  <Input
                    id="momo-phone"
                    name="phone"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    inputMode="tel"
                    placeholder="024 123 4567"
                    autoComplete="tel"
                    aria-invalid={Boolean(phoneError)}
                  />
                  <FieldError>{phoneError}</FieldError>
                </Field>
              </div>
              {formError && <FieldError>{formError}</FieldError>}
              <Button type="submit" disabled={addState.loading || loading}>
                {addState.loading ? "Saving…" : "Add number"}
              </Button>
            </>
          )
        }}
      </Form>

      <ul className="divide-y divide-border rounded-lg border">
        {loading && accounts.length === 0 ? (
          <li>
            <LoadingState label="payout numbers" />
          </li>
        ) : accounts.length === 0 ? (
          <li>
            <EmptyState
              title="No payout numbers yet."
              description="Add a mobile money contact using the form above. Payment settlement is managed separately in Paystack settlement."
              action={
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    document.getElementById("momo-account-name")?.focus()
                  }
                >
                  Add number
                </Button>
              }
            />
          </li>
        ) : (
          accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {momoProviderLabels[account.provider]}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {account.accountName} · {formatGhanaPhone(account.phone)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${formatGhanaPhone(account.phone)}`}
                disabled={removeState.loading && removingId === account.id}
                onClick={() => void remove(account.id)}
              >
                <TrashIcon />
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  )

  if (embedded) return body

  return (
    <section className="content-region mt-6 rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DeviceMobileIcon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            Mobile money contacts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved mobile money contacts across MTN, AirtelTigo and Telecel.
            Configure the payment destination in Paystack settlement.
          </p>
        </div>
      </div>
      {body}
    </section>
  )
}
