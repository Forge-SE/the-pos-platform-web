import { getRouteApi } from "@tanstack/react-router"
import { RestaurantDetail } from "@/features/ops/ops-restaurants"

const route = getRouteApi("/_ops/ops/restaurants/$restaurantId")

export function OpsRestaurant() {
  const { restaurantId } = route.useParams()
  const { tab } = route.useSearch()
  return (
    <RestaurantDetail
      key={restaurantId}
      restaurantId={restaurantId}
      tab={tab}
    />
  )
}
