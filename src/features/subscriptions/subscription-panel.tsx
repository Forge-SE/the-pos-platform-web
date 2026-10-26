import { useEffect, useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import * as Yup from "yup"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { formatMoney, mutationMessage } from "@/features/menu/model"

const SUBSCRIPTION_QUERY = gql`
  query RestaurantSubscription {
    subscriptionPlans {
      id
      name
      description
      amount
      currency
      interval
    }
    mySubscription {
      id
      status
      billingEmail
      lastPaidAt
      nextPaymentAt
      plan {
        id
        name
        amount
        currency
        interval
      }
    }
  }
`

const START_CHECKOUT = gql`
  mutation StartSubscriptionCheckout($planId: ID!, $email: String!) {
    startSubscriptionCheckout(planId: $planId, email: $email) {
      authorizationUrl
      reference
    }
  }
`

const CONFIRM_PAYMENT = gql`
  mutation ConfirmSubscriptionPayment($reference: String!) {
    confirmSubscriptionPayment(reference: $reference) {
      id
      status
      lastPaidAt
      nextPaymentAt
    }
  }
`

interface Plan {
  id: string
  name: string
  description: string | null
  amount: number
  currency: string
  interval: string
}

interface SubscriptionData {
  subscriptionPlans: Plan[]
  mySubscription: {
    id: string
    status: string
    billingEmail: string | null
    lastPaidAt: string | null
    nextPaymentAt: string | null
    plan: Plan
  } | null
}

const checkoutSchema = Yup.object({
  planId: Yup.string().required("Choose a plan."),
  email: Yup.string()
    .trim()
    .email("Enter a billing email.")
    .required("Enter a billing email."),
})

const statusLabel: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
}

function statusTone(status: string | undefined) {
  if (status === "ACTIVE") return "success" as const
  if (status === "PAST_DUE") return "warning" as const
  if (status === "PENDING") return "info" as const
  return "neutral" as const
}

function intervalLabel(interval: string) {
  if (interval === "quarterly") return "quarter"
  if (interval === "annually") return "year"
  return "month"
}

function formatWhen(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function SubscriptionPanel({
  canManage,
  embedded = false,
}: {
  canManage: boolean
  /** When true, omit the settings-card chrome so the settings shell supplies it. */
  embedded?: boolean
}) {
  const confirmed = useRef(false)
  const [notice, setNotice] = useState<string | null>(null)
  const { data, loading, error, refetch } =
    useQuery<SubscriptionData>(SUBSCRIPTION_QUERY)
  const [startCheckout, { loading: starting }] = useMutation<
    { startSubscriptionCheckout: { authorizationUrl: string } },
    { planId: string; email: string }
  >(START_CHECKOUT)
  const [confirmPayment] = useMutation(CONFIRM_PAYMENT)
  const subscription = data?.mySubscription
  const plans = data?.subscriptionPlans ?? []

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get(
      "reference"
    )
    if (!reference || confirmed.current || !canManage) return
    confirmed.current = true
    void confirmPayment({ variables: { reference } })
      .then(async () => {
        setNotice("Payment received. Your subscription is active.")
        window.history.replaceState({}, "", "/settings")
        await refetch()
      })
      .catch((paymentError) => {
        setNotice(
          mutationMessage(
            paymentError,
            "Paystack has not confirmed this payment yet."
          )
        )
      })
  }, [canManage, confirmPayment, refetch])

  return (
    <section className={embedded ? "min-w-0" : "mt-6 rounded-xl border border-border/70 bg-card p-5 sm:p-6"}>
      {!embedded && (
        <>
          <h2 className="text-lg font-semibold tracking-[-0.025em]">
            Subscription
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ovaal is billed through Paystack. This is the plan on the restaurant,
            the last payment, and the next due date.
          </p>
        </>
      )}
      {loading && <LoadingState className="mt-5" label="subscription" />}
      {error && (
        <ErrorState
          className="mt-5"
          title="Couldn’t load the subscription."
          onRetry={refetch}
        />
      )}
      {notice && (
        <p className="mt-4 text-sm text-secondary" role="status">
          {notice}
        </p>
      )}
      {!loading && !error && (
        <div className="border-b border-dashed border-border/70 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Current plan
              </p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.025em]">
                {subscription?.plan.name ?? "Not subscribed"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {subscription
                  ? `${formatMoney(subscription.plan.amount)} / ${intervalLabel(subscription.plan.interval)}`
                  : "Choose a plan below to start billing."}
              </p>
            </div>
            <StatusBadge tone={statusTone(subscription?.status)}>
              {subscription
                ? (statusLabel[subscription.status] ?? subscription.status)
                : "None"}
            </StatusBadge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Last paid
              </dt>
              <dd className="mt-1 text-sm font-medium tabular-nums">
                {formatWhen(subscription?.lastPaidAt ?? null)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Next payment
              </dt>
              <dd className="mt-1 text-sm font-medium tabular-nums">
                {formatWhen(subscription?.nextPaymentAt ?? null)}
              </dd>
            </div>
          </dl>
        </div>
      )}
      {canManage && !error && plans.length > 0 && (
        <Form
          className="py-6"
          initialValues={{
            planId: subscription?.plan.id ?? plans[0].id,
            email: subscription?.billingEmail ?? "",
          }}
          validationSchema={checkoutSchema}
          onSubmit={async (values, helpers) => {
            try {
              const result = await startCheckout({ variables: values })
              const url =
                result.data?.startSubscriptionCheckout.authorizationUrl
              if (!url)
                throw new Error("Paystack did not return a checkout link.")
              window.location.assign(url)
            } catch (checkoutError) {
              helpers.setStatus(
                mutationMessage(
                  checkoutError,
                  "Could not start Paystack checkout."
                )
              )
            }
          }}
        >
          {(formik) => (
            <>
              <fieldset>
                <legend className="text-sm font-medium">Choose a plan</legend>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Paystack charges this amount on the billing email below.
                </p>
                <div className="mt-3 grid gap-2">
                  {plans.map((plan) => {
                    const selected = formik.values.planId === plan.id
                    return (
                      <label
                        key={plan.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${selected ? "border-secondary bg-secondary/5" : "border-border/70 hover:bg-muted/40"}`}
                      >
                        <input
                          type="radio"
                          name="planId"
                          value={plan.id}
                          checked={selected}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="mt-1 size-4 accent-secondary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {plan.name}
                          </span>
                          {plan.description && (
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                              {plan.description}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                          {formatMoney(plan.amount)}
                          <span className="block text-xs font-normal text-muted-foreground">
                            / {intervalLabel(plan.interval)}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                <FieldError>{fieldError(formik, "planId")}</FieldError>
              </fieldset>
              <Field
                className="mt-5"
                data-invalid={Boolean(fieldError(formik, "email"))}
              >
                <FieldLabel htmlFor="billing-email">Billing email</FieldLabel>
                <Input
                  id="billing-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="owner@restaurant.com"
                />
                <FieldError>{fieldError(formik, "email")}</FieldError>
              </Field>
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={starting}>
                  {starting ? "Opening Paystack…" : "Pay with Paystack"}
                </Button>
              </div>
              {typeof formik.status === "string" && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {formik.status}
                </p>
              )}
            </>
          )}
        </Form>
      )}
      {canManage && !loading && !error && plans.length === 0 && (
        <EmptyState
          className="mt-5"
          title="No subscription tiers are available yet."
          description="Contact your platform administrator to configure a subscription tier."
          action={
            <Button
              variant="outline"
              size="lg"
              onClick={() => void refetch().catch(() => {})}
            >
              Check again
            </Button>
          }
        />
      )}
    </section>
  )
}
