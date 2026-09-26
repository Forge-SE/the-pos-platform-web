import { gql } from "@apollo/client"

import { uploadImageToCloudinary } from "@/lib/cloudinary"

export const MENU_MANAGEMENT_QUERY = gql`
  query MenuManagement {
    menuCategories {
      id
      name
      sortOrder
    }
    menuItems(includeInactive: true) {
      id
      categoryId
      name
      description
      price
      active
      imageUrl
      modifierGroups {
        id
        name
      }
    }
    modifierGroups {
      id
      name
      minSelections
      maxSelections
      options {
        id
        name
        priceDelta
        active
        imageUrl
      }
    }
  }
`

export const CREATE_CATEGORY = gql`
  mutation CreateMenuCategory($input: CreateCategoryInput!) {
    createMenuCategory(input: $input) {
      id
    }
  }
`

export const CREATE_ITEM = gql`
  mutation CreateMenuItem($input: CreateMenuItemInput!) {
    createMenuItem(input: $input) {
      id
      name
    }
  }
`

export const UPDATE_ITEM = gql`
  mutation UpdateMenuItem($input: UpdateMenuItemInput!) {
    updateMenuItem(input: $input) {
      id
      name
      price
    }
  }
`

export const SET_ITEM_AVAILABILITY = gql`
  mutation SetMenuItemAvailability($itemId: ID!, $active: Boolean!) {
    setMenuItemAvailability(itemId: $itemId, active: $active) {
      id
      active
    }
  }
`

export const CREATE_MODIFIER_GROUP = gql`
  mutation CreateModifierGroup($input: CreateModifierGroupInput!) {
    createModifierGroup(input: $input) {
      id
    }
  }
`

export const COMPLETE_OPTION_IMAGE = gql`
  mutation CompleteModifierOptionImageUpload(
    $optionId: ID!
    $objectKey: String!
  ) {
    completeModifierOptionImageUpload(
      optionId: $optionId
      objectKey: $objectKey
    ) {
      id
      imageUrl
    }
  }
`

export const CREATE_MODIFIER_OPTION = gql`
  mutation CreateModifierOption($input: CreateModifierOptionInput!) {
    createModifierOption(input: $input) {
      id
    }
  }
`

export const DETACH_MODIFIER_GROUP = gql`
  mutation DetachModifierGroup($menuItemId: ID!, $modifierGroupId: ID!) {
    detachModifierGroup(
      menuItemId: $menuItemId
      modifierGroupId: $modifierGroupId
    ) {
      id
    }
  }
`

export const ATTACH_MODIFIER_GROUP = gql`
  mutation AttachModifierGroup($menuItemId: ID!, $modifierGroupId: ID!) {
    attachModifierGroup(
      menuItemId: $menuItemId
      modifierGroupId: $modifierGroupId
    ) {
      id
    }
  }
`

export const REQUEST_ITEM_IMAGE_UPLOAD = gql`
  mutation RequestMenuItemImageUpload($menuItemId: ID!, $contentType: String!) {
    requestMenuItemImageUpload(
      menuItemId: $menuItemId
      contentType: $contentType
    ) {
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

export const COMPLETE_ITEM_IMAGE_UPLOAD = gql`
  mutation CompleteMenuItemImageUpload($menuItemId: ID!, $objectKey: String!) {
    completeMenuItemImageUpload(
      menuItemId: $menuItemId
      objectKey: $objectKey
    ) {
      id
      imageUrl
    }
  }
`

export interface MenuCategory {
  id: string
  name: string
  sortOrder: number
}

export interface ModifierOption {
  id: string
  name: string
  priceDelta: number
  active: boolean
  imageUrl?: string | null
}

export interface ModifierGroup {
  id: string
  name: string
  minSelections: number
  maxSelections: number
  options: ModifierOption[]
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  active: boolean
  imageUrl: string | null
  modifierGroups: Array<{ id: string; name: string }>
}

export interface MenuManagementData {
  menuCategories: MenuCategory[]
  menuItems: MenuItem[]
  modifierGroups: ModifierGroup[]
}

export interface ImageUploadData {
  requestMenuItemImageUpload: {
    objectKey: string
    url: string
    method: string
    headers: Array<{ name: string; value: string }>
  }
}

export interface CreatedItem {
  id: string
  name: string
}

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "verifying" }
  | { status: "done" }
  | { status: "error"; message: string }

const currency = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
})

export function formatMoney(value: number) {
  return currency.format(value / 100)
}

export function cedisToPesewas(value: string, allowNegative = false) {
  const normalized = value.trim()
  const pattern = allowNegative
    ? /^-?\d+(?:\.\d{1,2})?$/
    : /^\d+(?:\.\d{1,2})?$/
  if (!pattern.test(normalized)) return null
  const negative = normalized.startsWith("-")
  const [whole, decimals = ""] = normalized.replace("-", "").split(".")
  const amount = Number(whole) * 100 + Number(decimals.padEnd(2, "0"))
  return negative ? -amount : amount
}

export function mutationMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function validateImageFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use JPEG, PNG, or WebP.")
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MiB or smaller.")
  }
}

export async function uploadOptionImage(
  completeUpload: (variables: {
    optionId: string
    objectKey: string
  }) => Promise<unknown>,
  optionId: string,
  file: File
) {
  validateImageFile(file)
  const secureUrl = await uploadImageToCloudinary(file)
  await completeUpload({ optionId, objectKey: secureUrl })
}

export async function uploadMenuImage(
  completeUpload: (variables: {
    menuItemId: string
    objectKey: string
  }) => Promise<unknown>,
  itemId: string,
  file: File
) {
  validateImageFile(file)
  const secureUrl = await uploadImageToCloudinary(file)
  await completeUpload({ menuItemId: itemId, objectKey: secureUrl })
}
