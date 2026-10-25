import { Button } from "@/components/ui/button"

import type { RestaurantOnboardingValues } from "../onboarding-contract"
import { ReviewRow } from "./onboarding-fields"

export function OnboardingReviewStep({
  values,
  onEdit,
}: {
  values: RestaurantOnboardingValues
  onEdit: (step: number) => void
}) {
  return (
    <div className="space-y-5">
      <ReviewSection
        title="Restaurant"
        id="review-restaurant"
        onEdit={() => onEdit(0)}
      >
        <ReviewRow label="Name" value={values.name.trim()} />
        <ReviewRow label="Workspace" value={values.slug} />
        <ReviewRow
          label="Default orders"
          value={
            values.defaultDiningType === "DINE_IN" ? "Dine in" : "Takeaway"
          }
        />
        <ReviewRow label="Region" value="GHS · Africa/Accra" />
      </ReviewSection>

      <ReviewSection
        title="Owner access"
        id="review-access"
        onEdit={() => onEdit(1)}
      >
        <ReviewRow label="Owner" value={values.ownerName.trim()} />
        <ReviewRow label="Role" value="Owner" />
        <ReviewRow label="PIN" value="••••" />
      </ReviewSection>

      <ReviewSection
        title="Operating controls"
        id="review-controls"
        onEdit={() => onEdit(2)}
      >
        <ReviewRow
          label="Manager approval"
          value={`${values.managerDiscountThresholdPercent || "0"}% discount`}
        />
        <ReviewRow
          label="Cash variance alert"
          value={`GHS ${Number(values.reconciliationVarianceGhs || 0).toFixed(2)}`}
        />
      </ReviewSection>
    </div>
  )
}

function ReviewSection({
  title,
  id,
  onEdit,
  children,
}: {
  title: string
  id: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-center justify-between">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        <Button type="button" variant="ghost" size="xs" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <dl className="mt-2 divide-y divide-border rounded-lg border bg-muted/20 px-4">
        {children}
      </dl>
    </section>
  )
}
