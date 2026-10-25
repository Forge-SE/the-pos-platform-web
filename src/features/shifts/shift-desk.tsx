import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import * as Yup from "yup"

import { SectionPage } from "@/components/layout/section-page"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { getAccessTokenProfile } from "@/lib/auth-token"
import { hasPermission } from "@/lib/permissions"
import { SHIFT_CLOSURE_CHECK, ShiftPayments } from "./shift-payments"
import type { ClosureCheck } from "./shift-payments"
import {
  cedisToPesewas,
  formatMoney,
  mutationMessage,
} from "@/features/menu/model"
import { CURRENT_SHIFT_QUERY } from "@/features/shifts/current-shift"

const OPEN_SHIFT = gql`
  mutation OpenShift($input: OpenShiftInput!) {
    openShift(input: $input) {
      id
      status
      openingFloat
      openedAt
    }
  }
`

const CLOSE_SHIFT = gql`
  mutation CloseShift($input: CloseShiftInput!) {
    closeShift(input: $input) {
      id
      status
      openingFloat
      expectedCash
      countedCash
      variance
      varianceFlagged
      openedAt
      closedAt
    }
  }
`

interface OpenShift {
  id: string
  status: string
  openingFloat: number
  openedAt: string
}

interface ClosedShift extends OpenShift {
  expectedCash: number | null
  countedCash: number | null
  variance: number | null
  varianceFlagged: boolean
  closedAt: string | null
}

const moneySchema = Yup.object({
  amount: Yup.string()
    .trim()
    .matches(
      /^\d+(?:\.\d{1,2})?$/,
      "Enter an amount in cedis, such as 50 or 50.00."
    )
    .required("Enter an amount in cedis."),
})

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-GH", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  })
}

export function ShiftDesk() {
  const profile = getAccessTokenProfile()
  const canManage = profile?.role === "CASHIER" || profile?.role === "KITCHEN"
  const { data, loading, error, refetch } = useQuery<{
    currentShift: OpenShift | null
  }>(CURRENT_SHIFT_QUERY, {
    pollInterval: 30_000,
    notifyOnNetworkStatusChange: false,
  })
  const [openShift, { loading: opening }] = useMutation<
    { openShift: OpenShift },
    { input: { idempotencyKey: string; openingFloat: number } }
  >(OPEN_SHIFT)
  const [closeShift, { loading: closing }] = useMutation<
    { closeShift: ClosedShift },
    { input: { idempotencyKey: string; shiftId: string; countedCash: number } }
  >(CLOSE_SHIFT)
  const [actionError, setActionError] = useState<string | null>(null)
  const [closed, setClosed] = useState<ClosedShift | null>(null)

  const shift = data?.currentShift ?? null
  const closure = useQuery<{ shiftClosureCheck: ClosureCheck }>(
    SHIFT_CLOSURE_CHECK,
    {
      variables: { shiftId: shift?.id ?? "" },
      skip: !shift,
      fetchPolicy: "cache-and-network",
      pollInterval: 15000,
    }
  )
  const check =
    closure.data?.shiftClosureCheck.shiftId === shift?.id
      ? closure.data?.shiftClosureCheck
      : undefined
  const closeBlocked =
    closure.loading ||
    Boolean(closure.error) ||
    !check ||
    check.activeOrderCount > 0 ||
    check.unpaidOrders.length > 0

  async function submitOpen(amount: string) {
    const openingFloat = cedisToPesewas(amount)
    if (openingFloat == null) return
    try {
      setActionError(null)
      setClosed(null)
      await openShift({
        variables: {
          input: { idempotencyKey: window.crypto.randomUUID(), openingFloat },
        },
      })
      await refetch()
    } catch (mutationError) {
      setActionError(
        mutationMessage(mutationError, "The shift could not be opened.")
      )
    }
  }

  async function submitClose(shiftId: string, amount: string) {
    const countedCash = cedisToPesewas(amount)
    if (countedCash == null) return
    try {
      setActionError(null)
      const result = await closeShift({
        variables: {
          input: {
            idempotencyKey: window.crypto.randomUUID(),
            shiftId,
            countedCash,
          },
        },
      })
      if (result.data?.closeShift) setClosed(result.data.closeShift)
      await refetch()
    } catch (mutationError) {
      setActionError(
        mutationMessage(mutationError, "The shift could not be closed.")
      )
      void closure.refetch().catch(() => undefined)
    }
  }

  return (
    <SectionPage
      title="Shift & cash"
      description="Open the register, watch the current shift, and reconcile the cash drawer when you close."
    >
      <div
        className={
          error || (!loading && !shift && !canManage)
            ? "content-region mt-7"
            : "mt-7 grid gap-4 lg:grid-cols-2"
        }
      >
        {loading && <LoadingState className="mt-7" label="current shift" />}
        {error && (
          <ErrorState
            title="Couldn’t load the current shift."
            onRetry={refetch}
          />
        )}
        {!loading && !error && !shift && !canManage && (
          <EmptyState
            title="No open shift"
            description="A cashier or kitchen staff member can open the register."
            action={
              <Button
                variant="outline"
                size="lg"
                onClick={() => void refetch()}
              >
                Check again
              </Button>
            }
          />
        )}
        {!loading && !error && shift && (
          <section className="rounded-xl border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-[-0.025em]">
                Current shift
              </h2>
              <StatusBadge tone="success">Open</StatusBadge>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Opened</dt>
                <dd className="font-medium">{formatWhen(shift.openedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Opening float</dt>
                <dd className="font-medium">
                  {formatMoney(shift.openingFloat)}
                </dd>
              </div>
            </dl>
            {canManage ? (
              <Form
                className="mt-5 space-y-4"
                initialValues={{ amount: "" }}
                validationSchema={moneySchema}
                onSubmit={(values) => submitClose(shift.id, values.amount)}
              >
                {(formik) => {
                  const amountError = fieldError(formik, "amount")
                  return (
                    <>
                      <Field data-invalid={Boolean(amountError)}>
                        <FieldLabel htmlFor="counted-cash">
                          Counted cash (GHS)
                        </FieldLabel>
                        <Input
                          id="counted-cash"
                          name="amount"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formik.values.amount}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          aria-invalid={Boolean(amountError)}
                        />
                        <FieldError>{amountError}</FieldError>
                      </Field>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Count the notes and coins in the drawer. Finish or void
                        open orders, and record every payment, before closing.
                      </p>
                      <Button type="submit" disabled={closing || closeBlocked}>
                        {closing ? "Closing shift…" : "Close shift"}
                      </Button>
                      {closeBlocked && (
                        <p className="text-sm text-muted-foreground">
                          Resolve the orders in “Payments needing attention”
                          before closing. Refresh payments if the status has
                          changed.
                        </p>
                      )}
                    </>
                  )
                }}
              </Form>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                A cashier or kitchen staff member closes this shift.
              </p>
            )}
          </section>
        )}
        {!loading && !error && shift && (
          <ShiftPayments
            check={check}
            loading={closure.loading}
            error={Boolean(closure.error)}
            canRecord={hasPermission(profile, "PAYMENTS_RECORD")}
            onRefresh={closure.refetch}
          />
        )}
        {!loading && !error && !shift && canManage && (
          <section className="rounded-xl border border-border/70 bg-card p-5">
            <h2 className="text-lg font-semibold tracking-[-0.025em]">
              Open a shift
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter the cash already in the drawer. Sales for this sitting are
              tracked against that float.
            </p>
            <Form
              className="mt-5 space-y-4"
              initialValues={{ amount: "0.00" }}
              validationSchema={moneySchema}
              onSubmit={(values) => submitOpen(values.amount)}
            >
              {(formik) => {
                const amountError = fieldError(formik, "amount")
                return (
                  <>
                    <Field data-invalid={Boolean(amountError)}>
                      <FieldLabel htmlFor="opening-float">
                        Opening float (GHS)
                      </FieldLabel>
                      <Input
                        id="opening-float"
                        name="amount"
                        inputMode="decimal"
                        value={formik.values.amount}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        aria-invalid={Boolean(amountError)}
                      />
                      <FieldError>{amountError}</FieldError>
                    </Field>
                    <Button type="submit" disabled={opening}>
                      {opening ? "Opening shift…" : "Open shift"}
                    </Button>
                  </>
                )
              }}
            </Form>
          </section>
        )}
        {closed && !shift && (
          <section className="rounded-xl border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-[-0.025em]">
                Last close
              </h2>
              <StatusBadge
                tone={closed.varianceFlagged ? "destructive" : "success"}
              >
                {closed.varianceFlagged ? "Variance flagged" : "Balanced"}
              </StatusBadge>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <CashRow label="Expected cash" amount={closed.expectedCash} />
              <CashRow label="Counted cash" amount={closed.countedCash} />
              <CashRow label="Variance" amount={closed.variance} />
            </dl>
          </section>
        )}
      </div>
      {actionError && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
    </SectionPage>
  )
}

function CashRow({ label, amount }: { label: string; amount: number | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {amount == null ? "—" : formatMoney(amount)}
      </dd>
    </div>
  )
}
