import { gql } from "@apollo/client"

export const PERFORMANCE_QUERY = gql`
  query PerformanceOverview(
    $from: String!
    $to: String!
    $includeSales: Boolean!
  ) {
    salesSummary(from: $from, to: $to) @include(if: $includeSales) {
      totalSales
      grossSales
      netRevenue
      totalCollected
      discounts
      discountCount
      comps
      tips
      taxCollected
      refundsTotal
      refundedSales
      voidCount
      voidAmount
      historicalOrderCount
      taxBreakdown {
        name
        amount
      }
      orderCount
      paymentBreakdown {
        method
        amount
        refundedAmount
      }
    }
    operationsSummary(from: $from, to: $to) @include(if: $includeSales) {
      topItems {
        name
        quantity
        revenue
        orderCount
      }
      categories {
        name
        quantity
        revenue
        orderCount
      }
      diningTypes {
        label
        count
        amount
      }
      staff {
        id
        name
        orderCount
        grossSales
        discounts
        discountCount
      }
      shiftsClosed {
        id
        openedAt
        closedAt
        variance
        expectedCash
        countedCash
        varianceFlagged
        orderCount
        revenue
      }
      trend {
        date
        netRevenue
        orderCount
      }
      peakHours {
        weekday
        hour
        orderCount
      }
      customers {
        identifiedOrders
        totalOrders
        uniqueCustomers
        repeatCustomers
        repeatRate
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
  grossSales: number
  netRevenue: number
  totalCollected: number
  discounts: number
  discountCount: number
  comps: number
  tips: number
  taxCollected: number
  refundsTotal: number
  refundedSales: number
  voidCount: number
  voidAmount: number
  historicalOrderCount: number
  taxBreakdown: Array<{ name: string; amount: number }>
  orderCount: number
  paymentBreakdown: Array<{
    method: PaymentMethod
    amount: number
    refundedAmount: number
  }>
}

export interface CurrentShift {
  id: string
  status: string
  openingFloat: number
  openedAt: string
}

export interface PerformanceData {
  operationsSummary?: OperationsSummary
  salesSummary?: SalesToday
  currentShift: CurrentShift | null
  activeOrders: Array<{ id: string; status: OrderStatus }>
}

export interface OperationsSummary {
  topItems: Array<{
    name: string
    quantity: number
    revenue: number
    orderCount: number
  }>
  categories: Array<{
    name: string
    quantity: number
    revenue: number
    orderCount: number
  }>
  diningTypes: Array<{ label: string; count: number; amount: number }>
  staff: Array<{
    id: string
    name: string
    orderCount: number
    grossSales: number
    discounts: number
    discountCount: number
  }>
  shiftsClosed: Array<{
    id: string
    openedAt: string
    closedAt: string
    variance: number | null
    expectedCash: number | null
    countedCash: number | null
    varianceFlagged: boolean
    orderCount: number
    revenue: number
  }>
  trend: Array<{ date: string; netRevenue: number; orderCount: number }>
  peakHours: Array<{ weekday: number; hour: number; orderCount: number }>
  customers: {
    identifiedOrders: number
    totalOrders: number
    uniqueCustomers: number
    repeatCustomers: number
    repeatRate: number
  }
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
  currencyDisplay: "code",
  minimumFractionDigits: 2,
})

export function formatMoney(value: number) {
  return currency.format(value / 100)
}

export function averageOrderValue(sales: SalesToday) {
  if (sales.orderCount === 0) return 0
  return Math.round(sales.totalSales / sales.orderCount)
}
