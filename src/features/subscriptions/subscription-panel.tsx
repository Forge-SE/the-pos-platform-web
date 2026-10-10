import { useEffect, useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import * as Yup from "yup"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export function SubscriptionPanel({ canManage }: { canManage: boolean }) {
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
    <section className="mt-6 rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-[-0.025em]">
        Subscription
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ovaal is billed through Paystack. This is the plan on the restaurant,
        the last payment, and the next due date.
      </p>
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
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Status
            </dt>
            <dd className="mt-1">
              <Badge
                variant={
                  subscription?.status === "ACTIVE" ? "secondary" : "outline"
                }
              >
                {subscription
                  ? (statusLabel[subscription.status] ?? subscription.status)
                  : "Not subscribed"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Plan</dt>
            <dd className="mt-1 text-sm font-medium">
              {subscription
                ? `${subscription.plan.name} · ${formatMoney(subscription.plan.amount)} / ${intervalLabel(subscription.plan.interval)}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Last paid
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {formatWhen(subscription?.lastPaidAt ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Next payment due
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {formatWhen(subscription?.nextPaymentAt ?? null)}
            </dd>
          </div>
        </dl>
      )}
      {canManage && !error && plans.length > 0 && (
        <Form
          className="mt-6 grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
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
              <Field data-invalid={Boolean(fieldError(formik, "planId"))}>
                <FieldLabel htmlFor="subscription-plan">Plan</FieldLabel>
                <select
                  id="subscription-plan"
                  name="planId"
                  value={formik.values.planId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {formatMoney(plan.amount)} /{" "}
                      {intervalLabel(plan.interval)}
                    </option>
                  ))}
                </select>
                <FieldError>{fieldError(formik, "planId")}</FieldError>
              </Field>
              <Field data-invalid={Boolean(fieldError(formik, "email"))}>
                <FieldLabel htmlFor="billing-email">Billing email</FieldLabel>
                <Input
                  id="billing-email"
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <FieldError>{fieldError(formik, "email")}</FieldError>
              </Field>
              <Button type="submit" disabled={starting}>
                {starting ? "Opening Paystack…" : "Pay with Paystack"}
              </Button>
              {typeof formik.status === "string" && (
                <p
                  className="text-sm text-destructive sm:col-span-3"
                  role="alert"
                >
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
