import { getRouteApi } from "@tanstack/react-router"
import { OpsSubscriptionTier } from "@/features/ops/ops-subscription-tier"

const route = getRouteApi("/_ops/ops/subscriptions/$tierId")

export function OpsSubscriptionTierPage() {
  const { tierId } = route.useParams()
  const { tab } = route.useSearch()
  return <OpsSubscriptionTier key={tierId} tierId={tierId} tab={tab} />
}
