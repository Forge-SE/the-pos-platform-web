const QUEUE_KEY = "pos.offline-queue"
const DEVICE_KEY = "pos.device-id"
const MENU_KEY = "pos.menu-cache"
export const OFFLINE_QUEUE_EVENT = "pos-offline-queue"

export type QueuedOrder = {
  idempotencyKey: string
  paymentKey: string
  userId: string
  deviceId: string
  createdOfflineAt: string
  shiftId: string
  input: Record<string, unknown>
  amount: number
  status: "queued" | "conflict" | "waiting"
  error?: string
}

export function deviceId() {
  const existing = localStorage.getItem(DEVICE_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(DEVICE_KEY, created)
  return created
}

export function readQueue(): QueuedOrder[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeQueue(items: QueuedOrder[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT))
}

export function enqueueOrder(item: QueuedOrder) {
  const items = readQueue().filter(
    (current) => current.idempotencyKey !== item.idempotencyKey
  )
  items.push(item)
  writeQueue(items)
}

export function updateQueued(
  idempotencyKey: string,
  patch: Partial<QueuedOrder>
) {
  writeQueue(
    readQueue().map((item) =>
      item.idempotencyKey === idempotencyKey ? { ...item, ...patch } : item
    )
  )
}

export function removeQueued(idempotencyKey: string) {
  writeQueue(
    readQueue().filter((item) => item.idempotencyKey !== idempotencyKey)
  )
}

export function writeMenuCache(value: unknown) {
  localStorage.setItem(MENU_KEY, JSON.stringify(value))
}

export function readMenuCache<T>() {
  try {
    const raw = localStorage.getItem(MENU_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
