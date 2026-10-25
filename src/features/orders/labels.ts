export type DiningType = "DINE_IN" | "TAKEAWAY" | "DELIVERY"

export const diningLabels: Record<DiningType, string> = {
  DINE_IN: "Dine-In",
  TAKEAWAY: "Pickup",
  DELIVERY: "Delivery",
}

export function diningLabel(value: string) {
  return value in diningLabels ? diningLabels[value as DiningType] : value
}

export const statusLabels: Record<string, string> = {
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export function orderStatusTone(status: string) {
  if (status === "NEW") return "info" as const
  if (status === "PREPARING") return "progress" as const
  if (status === "READY") return "warning" as const
  if (status === "COMPLETED") return "success" as const
  return "neutral" as const
}
