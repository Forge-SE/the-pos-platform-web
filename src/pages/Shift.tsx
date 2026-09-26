import { getAccessTokenProfile } from "@/lib/auth-token"
import { ShiftDesk } from "@/features/shifts/shift-desk"
import { ShiftReview } from "@/features/shifts/shift-review"

export function Shift() {
  const profile = getAccessTokenProfile()
  if (profile?.role === "OWNER" || profile?.role === "MANAGER") {
    return <ShiftReview />
  }
  return <ShiftDesk />
}
