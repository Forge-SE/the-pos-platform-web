import { gql } from "@apollo/client"

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

export const CREATE_MODIFIER_OPTION = gql`
  mutation CreateModifierOption($input: CreateModifierOptionInput!) {
    createModifierOption(input: $input) {
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
  const pattern = allowNegative ? /^-?\d+(?:\.\d{1,2})?$/ : /^\d+(?:\.\d{1,2})?$/
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

interface UploadRequest {
  requestMenuItemImageUpload: ImageUploadData["requestMenuItemImageUpload"]
}

/**
 * Runs the full image upload: presigned PUT followed by server verification.
 * Takes the mutation callers so cards and the add-item flow can share it.
 */
export async function uploadMenuImage(
  requestUpload: (variables: {
    menuItemId: string
    contentType: string
  }) => Promise<{ data?: UploadRequest }>,
  completeUpload: (variables: {
    menuItemId: string
    objectKey: string
  }) => Promise<unknown>,
  itemId: string,
  file: File
) {
  validateImageFile(file)
  const request = await requestUpload({
    menuItemId: itemId,
    contentType: file.type,
  })
  const upload = request.data?.requestMenuItemImageUpload
  if (!upload) throw new Error("The upload could not be prepared.")
  const response = await fetch(upload.url, {
    method: upload.method,
    headers: Object.fromEntries(
      upload.headers.map((header) => [header.name, header.value])
    ),
    body: file,
  })
  if (!response.ok) throw new Error("The image upload failed.")
  await completeUpload({ menuItemId: itemId, objectKey: upload.objectKey })
}
