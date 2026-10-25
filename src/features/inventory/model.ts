import { gql } from "@apollo/client"

export interface StockItem {
  id: string
  name: string
  unit: string
  onHand: number
  reserved: number
  available: number
  reorderLevel: number
  version: number
  countReviewRequired: boolean
}
export interface RecipeLine {
  stockItemId: string
  modifierOptionId: string | null
  quantity: number
}
export interface Recipe {
  id: string
  menuItemId: string
  version: number
  enabled: boolean
  lines: RecipeLine[]
}
export interface Movement {
  id: string
  stockName: string
  unit: string
  kind: string
  quantity: number
  onHandDelta: number
  reservedDelta: number
  balanceAfter: number
  reservedAfter: number
  variance: number | null
  expectedQuantity: number | null
  orderId: string | null
  actorId: string
  actorName: string | null
  reason: string
  createdAt: string
}
export interface Meal {
  id: string
  name: string
  modifierGroups: Array<{
    id: string
    name: string
    options: Array<{ id: string; name: string }>
  }>
}
export const STOCK_QUERY = gql`
  query InventoryStock {
    inventoryItems {
      id
      name
      unit
      onHand
      reserved
      available
      reorderLevel
      version
      countReviewRequired
    }
  }
`
export const MEALS_QUERY = gql`
  query InventoryMeals {
    menuItems(includeInactive: true) {
      id
      name
      modifierGroups {
        id
        name
        options {
          id
          name
        }
      }
    }
  }
`
export const RECIPE_QUERY = gql`
  query InventoryRecipe($menuItemId: ID!) {
    inventoryRecipe(menuItemId: $menuItemId) {
      id
      menuItemId
      version
      enabled
      lines {
        stockItemId
        modifierOptionId
        quantity
      }
    }
  }
`
export const HISTORY_QUERY = gql`
  query InventoryHistory($offset: Int, $limit: Int) {
    inventoryHistory(offset: $offset, limit: $limit) {
      total
      items {
        id
        stockName
        unit
        kind
        quantity
        onHandDelta
        reservedDelta
        balanceAfter
        reservedAfter
        variance
        expectedQuantity
        orderId
        actorId
        actorName
        reason
        createdAt
      }
    }
  }
`
export const CREATE_STOCK = gql`
  mutation CreateInventoryItem($input: CreateInventoryItemInput!) {
    createInventoryItem(input: $input) {
      id
      name
    }
  }
`
export const RECORD_STOCK = gql`
  mutation RecordInventoryMovement($input: RecordInventoryMovementInput!) {
    recordInventoryMovement(input: $input) {
      id
      kind
      variance
    }
  }
`
export const SAVE_RECIPE = gql`
  mutation SaveInventoryRecipe($input: SaveInventoryRecipeInput!) {
    saveInventoryRecipe(input: $input) {
      id
      version
      enabled
    }
  }
`
export function amount(value: string) {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value.trim())) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed <= 1_000_000 ? parsed : undefined
}
export function displayQuantity(value: number, unit: string) {
  return `${new Intl.NumberFormat("en-GH", { maximumFractionDigits: 3 }).format(value)} ${unit}`
}
