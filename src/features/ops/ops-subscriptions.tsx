import { useState } from "react"
import { gql } from "@apollo/client"
import { useMutation, useQuery } from "@apollo/client/react"
import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react"
import { Link, useNavigate } from "@tanstack/react-router"
import * as Yup from "yup"

import { Badge } from "@/components/ui/badge"
import { EmptyState, ErrorState } from "@/components/content-state"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import Form, { fieldError } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useUrlState } from "@/lib/url-state"
import { useTablePagination } from "@/lib/table-state"

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

export function OpsSubscriptions() {
  const navigate = useNavigate()
  const [editing, setEditing] = useState<Plan | null | "new">(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { data, loading, error, refetch } = useQuery<{
    platformSubscriptionPlans: Plan[]
  }>(PLANS_QUERY, { context: opsAuthContext() })
  useOpsAuthError(error)
  const [createPlan, { loading: creating }] = useMutation(CREATE_PLAN, {
    context: opsAuthContext(),
  })
  const [updatePlan, { loading: updating }] = useMutation(UPDATE_PLAN, {
    context: opsAuthContext(),
  })
  const plans = data?.platformSubscriptionPlans ?? []
  const [planSearch, setPlanSearch] = useUrlState("planSearch")
  const planPaging = useTablePagination("plans")
  const filteredPlans = plans.filter((plan) =>
    plan.name.toLowerCase().includes((planSearch ?? "").toLowerCase().trim())
  )
  const visiblePlans = filteredPlans.slice(
    planPaging.pageIndex * planPaging.pageSize,
    (planPaging.pageIndex + 1) * planPaging.pageSize
  )
  const saving = creating || updating

  return (
    <>
      <OpsHeader
        title="Subscriptions"
        description="Manage pricing tiers. Open a tier to see payments, renewals, and restaurants on the plan."
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
      <section className="content-region mx-5 mb-8 flex min-h-[calc(100svh-11rem)] min-w-0 flex-1 flex-col overflow-hidden bg-card lg:mx-8">
        <h2 className="border-b border-border/70 px-4 py-3 text-sm font-semibold">
          Tiers
        </h2>
        <DataTable
          ariaLabel="Subscription plans"
          rows={visiblePlans}
          search={{
            value: planSearch ?? "",
            onChange: (value) => {
              setPlanSearch(value || null)
              planPaging.resetPage()
            },
            placeholder: "Search plans",
          }}
          onRefresh={() => void refetch()}
          isLoading={loading}
          pagination={{ ...planPaging, totalCount: filteredPlans.length }}
        >
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
            {!loading &&
              !error &&
              visiblePlans.length === 0 &&
              plans.length > 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title="No plans match your search."
                      description="Try another plan name."
                    />
                  </td>
                </tr>
              )}
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
              visiblePlans.map((plan) => (
                <tr
                  key={plan.id}
                  className="cursor-pointer border-t border-border/70 hover:bg-muted/40"
                  onClick={() =>
                    void navigate({
                      to: "/ops/subscriptions/$tierId",
                      params: { tierId: plan.id },
                      search: { tab: "analytics" },
                    })
                  }
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/ops/subscriptions/$tierId"
                      params={{ tierId: plan.id }}
                      search={{ tab: "analytics" }}
                      className="block font-medium hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {plan.name}
                    </Link>
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
                      size="sm"
                      render={
                        <Link
                          to="/ops/subscriptions/$tierId"
                          params={{ tierId: plan.id }}
                          search={{ tab: "analytics" }}
                        />
                      }
                      onClick={(event) => event.stopPropagation()}
                    >
                      View tier
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${plan.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
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
        </DataTable>
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
                    <Select
                      value={formik.values.interval}
                      onValueChange={(value) =>
                        void formik.setFieldValue("interval", value)
                      }
                    >
                      <SelectTrigger id="plan-interval" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
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
    </>
  )
}

export function AssignSubscription({
  plans,
  fixedPlanId,
  onClose,
  onSaved,
}: {
  plans: Array<Pick<Plan, "id" | "name" | "amount">>
  fixedPlanId?: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [search, setSearch] = useState("")
  const [restaurantId, setRestaurantId] = useState("")
  const [planId, setPlanId] = useState(fixedPlanId ?? plans[0]?.id)
  const [status, setStatus] = useState("PENDING")
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
          <Select
            value={restaurantId || null}
            onValueChange={(value) => setRestaurantId(value ?? "")}
          >
            <SelectTrigger aria-label="Restaurant" className="w-full">
              <SelectValue placeholder="Choose restaurant" />
            </SelectTrigger>
            <SelectContent>
              {restaurants.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fixedPlanId ? (
            <p className="rounded-md bg-muted/40 px-3 py-2.5 text-sm font-medium">
              {plans[0]?.name} · {formatMoney(plans[0]?.amount ?? 0)}
            </p>
          ) : (
            <Select
              value={planId || null}
              onValueChange={(value) => setPlanId(value ?? "")}
            >
              <SelectTrigger aria-label="Plan" className="w-full">
                <SelectValue placeholder="Choose plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} · {formatMoney(plan.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={status}
            onValueChange={(value) => setStatus(value ?? "PENDING")}
          >
            <SelectTrigger aria-label="Status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAST_DUE">Past due</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
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
