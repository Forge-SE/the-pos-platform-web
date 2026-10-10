import { gql } from "@apollo/client"

export const PAGE_SIZE = 25

export interface DayHours {
  day: string
  closed: boolean
  opens: string | null
  closes: string | null
}

export interface RestaurantCompliance {
  businessRegistrationNumber: string | null
  tin: string | null
  foodHygienePermit: string | null
  districtAssemblyPermit: string | null
  notes: string | null
}

export interface PlatformOwner {
  id: string
  name: string
  active: boolean
}

export interface PlatformRestaurant {
  id: string
  name: string
  slug: string
  code: string
  currency: string
  timezone: string
  description: string | null
  address: string | null
  city: string | null
  region: string | null
  openingHours: DayHours[] | null
  compliance: RestaurantCompliance | null
  defaultDiningType?: "DINE_IN" | "TAKEAWAY"
  suspended: boolean
  owner?: PlatformOwner | null
  createdAt: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  active: boolean
}

export const RESTAURANTS_QUERY = gql`
  query PlatformRestaurants($search: String, $limit: Int, $offset: Int) {
    platformRestaurants(search: $search, limit: $limit, offset: $offset) {
      items {
        id
        name
        slug
        code
        city
        region
        currency
        suspended
        owner {
          id
          name
          active
        }
        createdAt
      }
      total
    }
  }
`

export const RESTAURANT_DETAIL_QUERY = gql`
  query PlatformRestaurant($id: ID!) {
    platformRestaurant(id: $id) {
      restaurant {
        id
        name
        slug
        code
        currency
        timezone
        description
        address
        city
        region
        openingHours {
          day
          closed
          opens
          closes
        }
        compliance {
          businessRegistrationNumber
          tin
          foodHygienePermit
          districtAssemblyPermit
          notes
        }
        defaultDiningType
        suspended
        createdAt
      }
      staff {
        id
        name
        role
        active
      }
      staffCount
      activeStaffCount
    }
  }
`

export const AUDIT_LOGS_QUERY = gql`
  query PlatformAuditLogs(
    $restaurantId: ID
    $action: String
    $limit: Int
    $offset: Int
  ) {
    platformAuditLogs(
      restaurantId: $restaurantId
      action: $action
      limit: $limit
      offset: $offset
    ) {
      items {
        id
        restaurantId
        actorId
        action
        entityType
        entityId
        createdAt
      }
      total
    }
  }
`

export const SET_STAFF_ACTIVE = gql`
  mutation PlatformSetStaffActive(
    $restaurantId: ID!
    $userId: ID!
    $active: Boolean!
  ) {
    platformSetStaffActive(
      restaurantId: $restaurantId
      userId: $userId
      active: $active
    ) {
      id
      active
    }
  }
`

export const UPDATE_RESTAURANT = gql`
  mutation PlatformUpdateRestaurant(
    $id: ID!
    $input: UpdatePlatformRestaurantInput!
  ) {
    platformUpdateRestaurant(id: $id, input: $input) {
      id
      name
      suspended
    }
  }
`

export const SET_RESTAURANT_SUSPENDED = gql`
  mutation PlatformSetRestaurantSuspended($id: ID!, $suspended: Boolean!) {
    platformSetRestaurantSuspended(id: $id, suspended: $suspended) {
      id
      suspended
    }
  }
`

export const SETUP_RESTAURANT = gql`
  mutation PlatformSetupRestaurant($input: PlatformSetupRestaurantInput!) {
    platformSetupRestaurant(input: $input) {
      restaurant {
        id
        name
        slug
        code
        currency
        timezone
      }
      user {
        id
        name
        role
      }
    }
  }
`

export function formatWhen(value: string) {
  return new Date(value).toLocaleString()
}

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Western North",
  "Central",
  "Eastern",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
] as const
