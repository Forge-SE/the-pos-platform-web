import { gql } from "@apollo/client"

export const STAFF_QUERY = gql`
  query StaffManagement {
    staff {
      id
      name
      role
      active
    }
  }
`

export const CREATE_STAFF = gql`
  mutation CreateStaff($input: CreateStaffInput!) {
    createStaff(input: $input) {
      id
      name
      role
      active
    }
  }
`

export type StaffRole = "CASHIER" | "KITCHEN" | "MANAGER" | "OWNER"

export interface StaffMember {
  id: string
  name: string
  role: StaffRole
  active: boolean
}

export interface StaffData {
  staff: StaffMember[]
}

export const roleLabels: Record<StaffRole, string> = {
  CASHIER: "Cashier",
  KITCHEN: "Kitchen",
  MANAGER: "Manager",
  OWNER: "Owner",
}

export function readableStaffError(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (/pin.*already|already.*pin|conflict/i.test(message)) {
    return "That PIN is already assigned to another staff member. Choose a different four-digit PIN."
  }
  return message || "Could not create this staff account. Please try again."
}
