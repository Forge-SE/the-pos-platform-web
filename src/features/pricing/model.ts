import { gql } from "@apollo/client"

import { formatMoney } from "@/features/menu/model"

export type TaxProfileCode = "NOT_REGISTERED" | "GH_STANDARD" | "CUSTOM"
export type TaxPriceMode = "INCLUSIVE" | "EXCLUSIVE"
export interface TaxConfiguration {
  profileCode: TaxProfileCode
  profileVersionId: string | null
  priceMode: TaxPriceMode | "CUSTOM"
  rules: Array<{
    code: string
    name: string
    rateBps: number
    inclusive: boolean
  }>
}
export const TAX_PROFILE_QUERY = gql`
  query TaxProfileSettings {
    taxConfiguration {
      profileCode
      profileVersionId
      priceMode
      rules {
        code
        name
        rateBps
        inclusive
      }
    }
    taxProfiles {
      id
      profileCode
      label
      effectiveFrom
      rules {
        code
        name
        rateBps
      }
    }
  }
`
export const SET_TAX_PROFILE = gql`
  mutation SetTaxProfile($input: TaxProfileInput!) {
    setTaxProfile(input: $input) {
      profileCode
      profileVersionId
      priceMode
      rules {
        code
        name
        rateBps
        inclusive
      }
    }
  }
`

export const TAXES_QUERY = gql`
  query RestaurantTaxes {
    restaurantTaxes {
      id
      name
      rateBps
      inclusive
      isActive
    }
  }
`

export const CREATE_TAX = gql`
  mutation CreateRestaurantTax($input: TaxInput!) {
    createRestaurantTax(input: $input) {
      id
    }
  }
`

export const SET_TAX_ACTIVE = gql`
  mutation SetRestaurantTaxActive($id: ID!, $active: Boolean!) {
    setRestaurantTaxActive(id: $id, active: $active) {
      id
      isActive
    }
  }
`

export const DISCOUNTS_QUERY = gql`
  query DiscountCampaigns {
    discountCampaigns {
      id
      name
      scheduleType
      percentBps
      amount
      code
      startsAt
      endsAt
      maxUses
      usedCount
      status
    }
  }
`

export const CREATE_DISCOUNT = gql`
  mutation CreateDiscountCampaign($input: DiscountCampaignInput!) {
    createDiscountCampaign(input: $input) {
      id
      name
      scheduleType
      percentBps
      amount
      code
      status
    }
  }
`

export const SET_DISCOUNT_STATUS = gql`
  mutation SetDiscountCampaignStatus($id: ID!, $status: DiscountStatus!) {
    setDiscountCampaignStatus(id: $id, status: $status) {
      id
      status
    }
  }
`

export type Tax = {
  id: string
  name: string
  rateBps: number
  inclusive: boolean
  isActive: boolean
}

export type Campaign = {
  id: string
  name: string
  scheduleType: "ONE_TIME" | "SCHEDULED" | "CODE"
  percentBps: number | null
  amount: number | null
  code: string | null
  startsAt: string | null
  endsAt: string | null
  maxUses: number | null
  usedCount: number
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED"
}

export type CreatedCampaign = Pick<
  Campaign,
  "id" | "name" | "scheduleType" | "percentBps" | "amount" | "code" | "status"
>

export const scheduleLabels: Record<Campaign["scheduleType"], string> = {
  CODE: "Code",
  SCHEDULED: "Scheduled",
  ONE_TIME: "One-time",
}

export const statusLabels: Record<Campaign["status"], string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
}

export function taxRateLabel(rateBps: number) {
  return `${(rateBps / 100).toFixed(2)}%`
}

export function campaignValue(
  campaign: Pick<Campaign, "percentBps" | "amount">
) {
  if (campaign.percentBps != null) {
    const percent = campaign.percentBps / 100
    return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(2)}%`
  }
  return formatMoney(campaign.amount ?? 0)
}
