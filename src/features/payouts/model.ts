import { gql } from "@apollo/client"

export const MOMO_PROVIDERS = ["MTN", "AIRTELTIGO", "TELECEL"] as const

export type MomoProvider = (typeof MOMO_PROVIDERS)[number]

export const momoProviderLabels: Record<MomoProvider, string> = {
  MTN: "MTN MoMo",
  AIRTELTIGO: "AirtelTigo Money",
  TELECEL: "Telecel Cash",
}

export interface MomoAccount {
  id: string
  provider: MomoProvider
  accountName: string
  phone: string
}

export const MOMO_ACCOUNTS_QUERY = gql`
  query MomoAccounts {
    momoAccounts {
      id
      provider
      accountName
      phone
    }
  }
`

export const ADD_MOMO_ACCOUNT = gql`
  mutation AddMomoAccount($input: MomoAccountInput!) {
    addMomoAccount(input: $input) {
      id
      provider
      accountName
      phone
    }
  }
`

export const REMOVE_MOMO_ACCOUNT = gql`
  mutation RemoveMomoAccount($id: ID!) {
    removeMomoAccount(id: $id)
  }
`
