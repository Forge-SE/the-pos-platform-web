import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react"
import * as Yup from "yup"

import { Badge } from "@/components/ui/badge"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { OpsModal } from "@/features/ops/ops-overlays"
import { OpsHeader } from "@/features/ops/ops-shell"
import { PAGE_SIZE, RESTAURANTS_QUERY } from "@/features/ops/ops-model"
import type { PlatformRestaurant } from "@/features/ops/ops-model"
import { useOpsAuthError } from "@/features/ops/use-ops-auth-error"
import {
  cedisToPesewas,
  formatMoney,
  mutationMessage,
} from "@/features/menu/model"
import { opsAuthContext } from "@/lib/ops-token"

const PLANS_QUERY = gql`
  query PlatformSubscriptionPlans {
    platformSubscriptionPlans {
      id
      name
      description
      amount
      currency
      interval
      paystackPlanCode
      active
    }
    platformRestaurantSubscriptions {
      id
      restaurantId
      restaurantName
      status
      billingEmail
      lastPaidAt
      nextPaymentAt
      plan {
        id
        name
        amount
        interval
      }
    }
  }
`

const CREATE_PLAN = gql`
  mutation PlatformCreateSubscriptionPlan($input: SubscriptionPlanInput!) {
    platformCreateSubscriptionPlan(input: $input) {
      id
    }
  }
`

const UPDATE_PLAN = gql`
  mutation PlatformUpdateSubscriptionPlan(
    $id: ID!
    $input: SubscriptionPlanInput!
  ) {
    platformUpdateSubscriptionPlan(id: $id, input: $input) {
      id
    }
  }
`

const SET_SUBSCRIPTION = gql`
  mutation PlatformSetRestaurantSubscription(
    $restaurantId: ID!
    $planId: ID!
    $status: String!
  ) {
    platformSetRestaurantSubscription(
      restaurantId: $restaurantId
      planId: $planId
      status: $status
    ) {
      id
      status
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
  paystackPlanCode: string | null
  active: boolean
}

interface RestaurantSubscriptionRow {
  id: string
  restaurantId: string
  restaurantName: string
  status: string
  lastPaidAt: string | null
  nextPaymentAt: string | null
  plan: { id: string; name: string; amount: number; interval: string }
}

const planSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(2, "Enter a plan name.")
    .required("Enter a plan name."),
  description: Yup.string(),
  price: Yup.string()
    .trim()
    .test("cedis", "Enter a price in cedis.", (value) => {
      const amount = cedisToPesewas(value ?? "")
      return amount != null && amount > 0
    }),
  interval: Yup.string().oneOf(["monthly", "quarterly", "annually"]).required(),
  active: Yup.boolean().required(),
})

function pesewasToCedis(amount: number) {
  return (amount / 100).toFixed(2)
}

function formatWhen(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function OpsSubscriptions() {
  const [editing, setEditing] = useState<Plan | null | "new">(null)
  const [assigning, setAssigning] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { data, loading, error, refetch } = useQuery<{
    platformSubscriptionPlans: Plan[]
    platformRestaurantSubscriptions: RestaurantSubscriptionRow[]
  }>(PLANS_QUERY, { context: opsAuthContext() })
  useOpsAuthError(error)
  const [createPlan, { loading: creating }] = useMutation(CREATE_PLAN, {
    context: opsAuthContext(),
  })
  const [updatePlan, { loading: updating }] = useMutation(UPDATE_PLAN, {
    context: opsAuthContext(),
  })
  const plans = data?.platformSubscriptionPlans ?? []
  const subscriptions = data?.platformRestaurantSubscriptions ?? []
  const saving = creating || updating

  return (
    <>
      <OpsHeader
        title="Subscriptions"
        description="Set Paystack pricing tiers and assign a plan to a restaurant."
      >
        <Button
          onClick={() => {
            setFormError(null)
            setEditing("new")
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add tier
        </Button>
      </OpsHeader>
      <section className="content-region mx-4 mb-6 overflow-hidden rounded-xl border border-border/70 bg-card lg:mx-8">
        <h2 className="border-b border-border/70 px-4 py-3 text-sm font-semibold">
          Tiers
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Paystack</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5}>
                  <LoadingState className="min-h-48" label="plans" />
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5}>
                  <ErrorState
                    title="Couldn’t load subscriptions."
                    onRetry={refetch}
                  />
                </td>
              </tr>
            )}
            {!loading && !error && plans.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No tiers yet."
                    description="Create a pricing tier before assigning subscriptions."
                    action={
                      <Button
                        size="lg"
                        onClick={() => {
                          setFormError(null)
                          setEditing("new")
                        }}
                      >
                        Add tier
                      </Button>
                    }
                  />
                </td>
              </tr>
            )}
            {!error &&
              plans.map((plan) => (
                <tr key={plan.id} className="border-t border-border/70">
                  <td className="px-4 py-3">
                    <span className="block font-medium">{plan.name}</span>
                    {plan.description && (
                      <span className="text-xs text-muted-foreground">
                        {plan.description}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatMoney(plan.amount)} / {plan.interval}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {plan.paystackPlanCode ?? "Not linked"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={plan.active ? "secondary" : "outline"}>
                      {plan.active ? "Active" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${plan.name}`}
                      onClick={() => {
                        setFormError(null)
                        setEditing(plan)
                      }}
                    >
                      <PencilSimpleIcon />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section className="content-region mx-4 mb-8 overflow-hidden rounded-xl border border-border/70 bg-card lg:mx-8">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <h2 className="text-sm font-semibold">Restaurant subscriptions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssigning(true)}
            disabled={plans.length === 0}
          >
            Assign plan
          </Button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Restaurant</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last paid</th>
              <th className="px-4 py-3 font-medium">Next due</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5}>
                  <ErrorState
                    title="Couldn’t load subscriptions."
                    onRetry={refetch}
                  />
                </td>
              </tr>
            )}
            {!loading && !error && subscriptions.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No restaurant is on a plan yet."
                    description={
                      plans.length
                        ? "Assign a pricing tier to a restaurant."
                        : "Add a pricing tier first, then assign it to a restaurant."
                    }
                    action={
                      <Button
                        size="lg"
                        onClick={() => {
                          if (plans.length) setAssigning(true)
                          else {
                            setFormError(null)
                            setEditing("new")
                          }
                        }}
                      >
                        {plans.length ? "Assign plan" : "Add tier"}
                      </Button>
                    }
                  />
                </td>
              </tr>
            )}
            {!error &&
              subscriptions.map((row) => (
                <tr key={row.id} className="border-t border-border/70">
                  <td className="px-4 py-3 font-medium">
                    {row.restaurantName}
                  </td>
                  <td className="px-4 py-3">{row.plan.name}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatWhen(row.lastPaidAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatWhen(row.nextPaymentAt)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {editing && (
        <OpsModal
          wide
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          title={editing === "new" ? "Add tier" : `Edit ${editing.name}`}
          description="Price is charged in cedis through Paystack on the interval you choose."
          footer={
            <>
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" form="subscription-plan" disabled={saving}>
                {saving ? "Saving…" : "Save tier"}
              </Button>
            </>
          }
        >
          <Form
            id="subscription-plan"
            className="mt-5 space-y-4"
            initialValues={{
              name: editing === "new" ? "" : editing.name,
              description: editing === "new" ? "" : (editing.description ?? ""),
              price: editing === "new" ? "" : pesewasToCedis(editing.amount),
              interval: editing === "new" ? "monthly" : editing.interval,
              active: editing === "new" ? true : editing.active,
            }}
            validationSchema={planSchema}
            onSubmit={async (values) => {
              const amount = cedisToPesewas(values.price)
              if (amount == null) return
              const input = {
                name: values.name.trim(),
                description: values.description.trim() || null,
                amount,
                interval: values.interval,
                active: values.active,
              }
              try {
                setFormError(null)
                if (editing === "new") {
                  await createPlan({ variables: { input } })
                } else {
                  await updatePlan({ variables: { id: editing.id, input } })
                }
                setEditing(null)
                await refetch()
              } catch (mutationError) {
                setFormError(
                  mutationMessage(mutationError, "Could not save this tier.")
                )
              }
            }}
          >
            {(formik) => (
              <>
                {formError && (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                )}
                <Field data-invalid={Boolean(fieldError(formik, "name"))}>
                  <FieldLabel htmlFor="plan-name">Name</FieldLabel>
                  <Input
                    id="plan-name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  <FieldError>{fieldError(formik, "name")}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="plan-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    id="plan-description"
                    name="description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(fieldError(formik, "price"))}>
                    <FieldLabel htmlFor="plan-price">Price (GHS)</FieldLabel>
                    <Input
                      id="plan-price"
                      name="price"
                      inputMode="decimal"
                      value={formik.values.price}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <FieldError>{fieldError(formik, "price")}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="plan-interval">Interval</FieldLabel>
                    <select
                      id="plan-interval"
                      name="interval"
                      value={formik.values.interval}
                      onChange={formik.handleChange}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={formik.values.active}
                    onCheckedChange={(active) =>
                      void formik.setFieldValue("active", active)
                    }
                  />
                  Available for restaurants to buy
                </label>
              </>
            )}
          </Form>
        </OpsModal>
      )}

      {assigning && (
        <AssignSubscription
          plans={plans.filter((plan) => plan.active)}
          onClose={() => setAssigning(false)}
          onSaved={async () => {
            setAssigning(false)
            await refetch()
          }}
        />
      )}
    </>
  )
}

function AssignSubscription({
  plans,
  onClose,
  onSaved,
}: {
  plans: Plan[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [search, setSearch] = useState("")
  const [restaurantId, setRestaurantId] = useState("")
  const [planId, setPlanId] = useState(plans[0]?.id ?? "")
  const [status, setStatus] = useState("ACTIVE")
  const [confirming, setConfirming] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    data,
    error: restaurantsError,
    loading: restaurantsLoading,
    refetch: refetchRestaurants,
  } = useQuery<
    { platformRestaurants: { items: PlatformRestaurant[] } },
    { search: string | null; limit: number; offset: number }
  >(RESTAURANTS_QUERY, {
    variables: { search: search.trim() || null, limit: PAGE_SIZE, offset: 0 },
    context: opsAuthContext(),
  })
  const [setSubscription, { loading }] = useMutation(SET_SUBSCRIPTION, {
    context: opsAuthContext(),
  })
  const restaurants = data?.platformRestaurants.items ?? []

  async function save() {
    try {
      setFormError(null)
      await setSubscription({ variables: { restaurantId, planId, status } })
      await onSaved()
    } catch (mutationError) {
      setFormError(
        mutationMessage(mutationError, "Could not update this subscription.")
      )
      setConfirming(false)
    }
  }

  return (
    <OpsModal
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={confirming ? "Confirm subscription change" : "Assign plan"}
      description={
        confirming
          ? status === "CANCELLED"
            ? "This cancels the restaurant’s subscription. They will need to pay again to restore it."
            : "Save this plan and status for the restaurant."
          : "Pick a restaurant, a tier, and the status to store."
      }
      footer={
        confirming ? (
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Back
            </Button>
            <Button
              variant={status === "CANCELLED" ? "destructive" : "default"}
              disabled={loading}
              onClick={() => void save()}
            >
              {loading ? "Saving…" : "Confirm"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!restaurantId || !planId}
              onClick={() => setConfirming(true)}
            >
              Continue
            </Button>
          </>
        )
      }
    >
      {!confirming && (
        <div className="mt-4 space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search restaurants"
            aria-label="Search restaurants"
          />
          {restaurantsError && (
            <ErrorState
              title="Could not load restaurants."
              onRetry={refetchRestaurants}
            />
          )}
          {restaurantsLoading && <LoadingState label="restaurants" />}
          {!restaurantsLoading &&
            !restaurantsError &&
            restaurants.length === 0 && (
              <EmptyState
                title="No restaurants found."
                description="Try a different search or provision a restaurant first."
                action={
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </Button>
                }
              />
            )}
          <select
            aria-label="Restaurant"
            value={restaurantId}
            onChange={(event) => setRestaurantId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Choose restaurant</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Plan"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {formatMoney(plan.amount)}
              </option>
            ))}
          </select>
          <select
            aria-label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="PAST_DUE">Past due</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      )}
      {formError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}
    </OpsModal>
  )
}
