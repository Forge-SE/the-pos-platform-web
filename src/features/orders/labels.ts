export type DiningType = "DINE_IN" | "TAKEAWAY" | "DELIVERY"

export const diningLabels: Record<DiningType, string> = {
  DINE_IN: "Dine-In",
  TAKEAWAY: "Pickup",
  DELIVERY: "Delivery",
}

export function diningLabel(value: string) {
  return diningLabels[value as DiningType] ?? value
}

export const statusLabels: Record<string, string> = {
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}
