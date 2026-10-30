export interface ActiveOrder {
  id: string
  ticketNumber: string
  status: "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
  diningType: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  notes: string | null
  tip: number
  total: number
  createdAt: string
  payment: { method: "CASH" | "MOMO" | "TRANSFER" } | null
  items: Array<{
    id: string
    name: string
    quantity: number
    notes: string | null
    modifiers: Array<{ id: string; name: string }>
  }>
}

export interface SalesData {
  salesToday: {
    totalSales: number
    orderCount: number
    paymentBreakdown: Array<{
      method: "CASH" | "MOMO" | "TRANSFER"
      amount: number
    }>
  }
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

export const paymentLabels: Record<
  NonNullable<ActiveOrder["payment"]>["method"],
  string
> = {
  CASH: "Cash",
  MOMO: "Mobile money",
  TRANSFER: "Transfer",
}

export function elapsedLabel(createdAt: string, language: "en" | "fr") {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  )
  if (minutes < 1) return language === "fr" ? "À l’instant" : "Just now"
  if (language === "fr") return `Il y a ${minutes} min`
  if (minutes === 1) return "1 min ago"
  return `${minutes} min ago`
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
