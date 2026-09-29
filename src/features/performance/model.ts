import { gql } from "@apollo/client"

export const PERFORMANCE_QUERY = gql`
  query PerformanceOverview(
    $from: String!
    $to: String!
    $includeSales: Boolean!
  ) {
    salesSummary(from: $from, to: $to) @include(if: $includeSales) {
      totalSales
      orderCount
      paymentBreakdown {
        method
        amount
      }
    }
    currentShift {
      id
      status
      openingFloat
      openedAt
    }
    activeOrders {
      id
      status
    }
  }
`

export const STAFF_ROSTER_QUERY = gql`
  query PerformanceStaffRoster {
    staff {
      id
      name
      role
      active
    }
  }
`

export type PaymentMethod = "CASH" | "MOMO" | "TRANSFER"
export type OrderStatus =
  "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"

export interface SalesToday {
  totalSales: number
  orderCount: number
  paymentBreakdown: Array<{ method: PaymentMethod; amount: number }>
}

export interface CurrentShift {
  id: string
  status: string
  openingFloat: number
  openedAt: string
}

export interface PerformanceData {
  salesSummary?: SalesToday
  currentShift: CurrentShift | null
  activeOrders: Array<{ id: string; status: OrderStatus }>
}

export interface StaffRosterData {
  staff: Array<{
    id: string
    name: string
    role: "CASHIER" | "KITCHEN" | "MANAGER" | "OWNER"
    active: boolean
  }>
}

const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
})

export function formatMoney(value: number) {
  return currency.format(value / 100)
}

export function averageOrderValue(sales: SalesToday) {
  if (sales.orderCount === 0) return 0
  return Math.round(sales.totalSales / sales.orderCount)
}

// ---------------------------------------------------------------------------
// Clearly synthetic placeholder data. Round numbers and an explicit sample
// range so nobody mistakes these for real performance figures.
// ---------------------------------------------------------------------------

export const SAMPLE_RANGE_LABEL = "Sample · Jan 2026"

export interface TrendPoint {
  label: string
  value: number
}

export const SAMPLE_TREND_WEEK: TrendPoint[] = [
  { label: "Mon", value: 1200 },
  { label: "Tue", value: 900 },
  { label: "Wed", value: 1100 },
  { label: "Thu", value: 1400 },
  { label: "Fri", value: 2000 },
  { label: "Sat", value: 2500 },
  { label: "Sun", value: 1800 },
]

export interface RankedItem {
  name: string
  orders: number
  revenue: number
}

export const SAMPLE_BEST_SELLERS: RankedItem[] = [
  { name: "Jollof rice", orders: 120, revenue: 300000 },
  { name: "Fried rice", orders: 100, revenue: 250000 },
  { name: "Banku & tilapia", orders: 80, revenue: 240000 },
  { name: "Waakye", orders: 70, revenue: 140000 },
  { name: "Chicken wings", orders: 50, revenue: 100000 },
]

export const SAMPLE_HEATMAP_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]
export const SAMPLE_HEATMAP_HOURS = ["9a", "12p", "3p", "6p", "9p"]
/** Synthetic intensity 0–4 per [day][hour]. */
export const SAMPLE_HEATMAP: number[][] = [
  [1, 3, 2, 2, 0],
  [1, 2, 2, 3, 1],
  [1, 3, 2, 3, 1],
  [2, 3, 2, 4, 1],
  [2, 4, 3, 4, 2],
  [3, 4, 4, 4, 3],
  [2, 3, 3, 3, 2],
]

export interface CategoryStat {
  name: string
  share: number
}

export const SAMPLE_CATEGORIES: CategoryStat[] = [
  { name: "Mains", share: 50 },
  { name: "Drinks", share: 25 },
  { name: "Sides", share: 15 },
  { name: "Desserts", share: 10 },
]

export interface StaffStat {
  name: string
  orders: number
  discounts: number
}

export const SAMPLE_STAFF_STATS: StaffStat[] = [
  { name: "Ama Mensah", orders: 60, discounts: 2 },
  { name: "Kwame Osei", orders: 50, discounts: 5 },
  { name: "Efua Adu", orders: 40, discounts: 1 },
]
