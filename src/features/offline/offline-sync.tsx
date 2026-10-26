import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useApolloClient, useSubscription } from "@apollo/client/react"

import { getAccessTokenProfile } from "@/lib/auth-token"
import {
  OFFLINE_QUEUE_EVENT,
  readQueue,
  removeQueued,
  updateQueued,
} from "@/features/offline/queue"
import type { QueuedOrder } from "@/features/offline/queue"

const CREATE_ORDER = gql`
  mutation SyncOfflineOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      total
    }
  }
`

const RECORD_PAYMENT = gql`
  mutation SyncOfflinePayment($input: RecordPaymentInput!) {
    recordPayment(input: $input) {
      id
    }
  }
`

const NOTIFICATIONS = gql`
  subscription OfflineNotificationRaised {
    notificationRaised {
      id
    }
  }
`

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  return "The offline order could not sync."
}

async function syncOne(
  client: ReturnType<typeof useApolloClient>,
  item: QueuedOrder
) {
  const created = await client.mutate({
    mutation: CREATE_ORDER,
    variables: { input: item.input },
  })
  const order = (
    created.data as { createOrder?: { id: string; total: number } } | null
  )?.createOrder
  if (!order) throw new Error("The order was not created.")
  if (item.amount > 0 && order.total > 0) {
    await client.mutate({
      mutation: RECORD_PAYMENT,
      variables: {
        input: {
          idempotencyKey: item.paymentKey,
          orderId: order.id,
          method: "CASH",
          amount: Math.min(item.amount, order.total),
          receiptChannel: "PRINT",
        },
      },
    })
  }
  removeQueued(item.idempotencyKey)
}

export function OfflineSync() {
  const client = useApolloClient()
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  )
  const [pending, setPending] = useState(0)
  const [conflicts, setConflicts] = useState(0)
  useSubscription(NOTIFICATIONS, { skip: !getAccessTokenProfile() })

  useEffect(() => {
    function refresh() {
      const mine = readQueue().filter(
        (item) => item.userId === getAccessTokenProfile()?.sub
      )
      setPending(mine.filter((item) => item.status !== "conflict").length)
      setConflicts(mine.filter((item) => item.status === "conflict").length)
    }
    function onOnline() {
      setOnline(true)
    }
    function onOffline() {
      setOnline(false)
    }
    refresh()
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    window.addEventListener(OFFLINE_QUEUE_EVENT, refresh)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      window.removeEventListener(OFFLINE_QUEUE_EVENT, refresh)
    }
  }, [])

  useEffect(() => {
    if (!online) return
    const profile = getAccessTokenProfile()
    if (!profile) return
    let cancelled = false
    async function drain() {
      const items = readQueue().filter(
        (item) => item.userId === profile?.sub && item.status !== "conflict"
      )
      for (const item of items) {
        if (cancelled) return
        try {
          await syncOne(client, item)
        } catch (error) {
          const text = messageOf(error)
          if (text.toLowerCase().includes("open shift")) {
            updateQueued(item.idempotencyKey, {
              status: "waiting",
              error: "Waiting for an open shift before this ticket can sync.",
            })
            continue
          }
          if (
            text.toLowerCase().includes("idempotency") ||
            text.toLowerCase().includes("conflict")
          ) {
            updateQueued(item.idempotencyKey, {
              status: "conflict",
              error:
                "This offline ticket conflicts with an order already saved.",
            })
            continue
          }
          updateQueued(item.idempotencyKey, { status: "queued", error: text })
          return
        }
      }
    }
    void drain()
    return () => {
      cancelled = true
    }
  }, [client, online, pending])

  if (online && pending === 0 && conflicts === 0) return null
  const text = !online
    ? "This till is offline. Cash orders stay on this device and MoMo stays off until the connection returns."
    : conflicts
      ? `${conflicts} offline ${conflicts === 1 ? "order conflicts" : "orders conflict"} with the server. A manager should review them.`
      : `Syncing ${pending} offline ${pending === 1 ? "order" : "orders"}.`
  return (
    <div className="sticky top-0 z-40 bg-secondary px-4 py-2 text-center text-sm text-secondary-foreground">
      {text}
    </div>
  )
}
