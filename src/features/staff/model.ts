import { gql } from "@apollo/client"

export const STAFF_QUERY = gql`
  query StaffManagement {
    staff {
      id
      name
      role
      active
      permissions
      avatarUrl
      pinSet
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
      permissions
      avatarUrl
      pinSet
    }
  }
`

export const REQUEST_STAFF_AVATAR = gql`
  mutation RequestStaffAvatarUpload($staffId: ID!, $contentType: String!) {
    requestStaffAvatarUpload(staffId: $staffId, contentType: $contentType) {
      objectKey
      url
      method
      headers {
        name
        value
      }
    }
  }
`

export const COMPLETE_STAFF_AVATAR = gql`
  mutation CompleteStaffAvatarUpload($staffId: ID!, $objectKey: String!) {
    completeStaffAvatarUpload(staffId: $staffId, objectKey: $objectKey) {
      id
      avatarUrl
    }
  }
`

export const UPDATE_STAFF_PERMISSIONS = gql`
  mutation UpdateStaffPermissions($staffId: ID!, $permissions: [String!]!) {
    updateStaffPermissions(staffId: $staffId, permissions: $permissions) {
      id
      name
      role
      active
      permissions
    }
  }
`

export type StaffRole = "CASHIER" | "KITCHEN" | "MANAGER" | "OWNER"

export interface StaffMember {
  id: string
  name: string
  role: StaffRole
  active: boolean
  permissions?: string[]
  avatarUrl?: string | null
  pinSet?: boolean
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
  return message || "Could not save this staff profile. Please try again."
}
