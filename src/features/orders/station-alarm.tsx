import { useEffect, useRef, useState } from "react"
import { gql } from "@apollo/client"
import { useQuery, useSubscription } from "@apollo/client/react"
import { BellRingingIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { getAccessTokenProfile } from "@/lib/auth-token"
import {
  playStationChime,
  unlockStationChime,
} from "@/features/orders/station-chime"

const STORAGE_KEY = "pos.station-alarm"

const ACTIVE_ORDERS = gql`
  query StationAlarmOrders {
    activeOrders {
      id
      status
    }
  }
`

const ORDER_CREATED = gql`
  subscription StationAlarmCreated {
    orderCreated {
      id
      status
    }
  }
`

const ORDER_CHANGED = gql`
  subscription StationAlarmChanged {
    orderStatusChanged {
      id
      status
    }
  }
`

type Ticket = { id: string; status: string }

function alertsFor(role: "KITCHEN" | "CASHIER", status: string) {
  return role === "KITCHEN" ? status === "NEW" : status === "READY"
}

export function StationAlarm({
  fullscreen = false,
  inline = false,
}: {
  fullscreen?: boolean
  inline?: boolean
}) {
  const role = getAccessTokenProfile()?.role
  const station = role === "KITCHEN" || role === "CASHIER" ? role : null
  const [armed, setArmed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "on"
  )
  const [pending, setPending] = useState<string[]>([])
  const known = useRef<Map<string, string> | null>(null)
  const { data } = useQuery<{ activeOrders: Ticket[] }>(ACTIVE_ORDERS, {
    skip: !station,
    pollInterval: 20_000,
  })

  const queued = useRef<Ticket[]>([])

  function absorb(order: Ticket) {
    if (!station) return
    if (!known.current) {
      queued.current.push(order)
      return
    }
    const previous = known.current.get(order.id)
    known.current.set(order.id, order.status)
    const hit = alertsFor(station, order.status) && previous !== order.status
    setPending((current) => {
      if (hit)
        return current.includes(order.id) ? current : [...current, order.id]
      if (!alertsFor(station, order.status)) {
        return current.filter((id) => id !== order.id)
      }
      return current
    })
  }

  useEffect(() => {
    if (!station || !data) return
    if (!known.current) {
      known.current = new Map(
        data.activeOrders.map((order) => [order.id, order.status])
      )
      const missed = queued.current.splice(0)
      for (const order of missed) {
        if (alertsFor(station, order.status)) {
          setPending((current) =>
            current.includes(order.id) ? current : [...current, order.id]
          )
        }
      }
      return
    }
    const seen = new Set<string>()
    for (const order of data.activeOrders) {
      seen.add(order.id)
      absorb(order)
    }
    for (const id of known.current.keys()) {
      if (!seen.has(id)) known.current.delete(id)
    }
    setPending((current) => {
      const next = current.filter((id) => {
        const status = known.current?.get(id)
        return seen.has(id) && status != null && alertsFor(station, status)
      })
      if (
        next.length === current.length &&
        next.every((id, index) => id === current[index])
      ) {
        return current
      }
      return next
    })
  }, [data, station])

  useSubscription<{ orderCreated: Ticket }>(ORDER_CREATED, {
    skip: !station,
    onData({ data: payload }) {
      const order = payload.data?.orderCreated
      if (order) absorb(order)
    },
  })
  useSubscription<{ orderStatusChanged: Ticket }>(ORDER_CHANGED, {
    skip: !station,
    onData({ data: payload }) {
      const order = payload.data?.orderStatusChanged
      if (order) absorb(order)
    },
  })

  useEffect(() => {
    if (!armed || !station || pending.length === 0) return
    const kind = station === "KITCHEN" ? "kitchen" : "cashier"
    playStationChime(kind)
    const timer = window.setInterval(() => playStationChime(kind), 8_000)
    return () => window.clearInterval(timer)
  }, [armed, pending.length, station])

  if (!station) return null

  const ringing = armed && pending.length > 0
  const label = !armed
    ? "Alarm"
    : ringing
      ? station === "KITCHEN"
        ? "New ticket"
        : "Order ready"
      : "Alarm on"

  return (
    <div
      className={
        inline
          ? "relative"
          : fullscreen
            ? "absolute right-4 bottom-4 z-40"
            : "absolute top-3.5 right-[6.75rem] z-30 lg:top-8 lg:right-[4.75rem]"
      }
    >
      <Button
        type="button"
        variant={ringing ? "default" : "outline"}
        size="icon"
        aria-pressed={armed}
        aria-label={
          !armed
            ? station === "KITCHEN"
              ? "Turn on the new-ticket alarm"
              : "Turn on the order-ready alarm"
            : ringing
              ? "Silence the alarm"
              : "Turn the alarm off"
        }
        className={ringing ? "motion-safe:animate-pulse" : undefined}
        title={label}
        onClick={() => {
          if (!armed) {
            unlockStationChime()
            playStationChime(station === "KITCHEN" ? "kitchen" : "cashier")
            localStorage.setItem(STORAGE_KEY, "on")
            setArmed(true)
            return
          }
          if (pending.length > 0) {
            setPending([])
            return
          }
          localStorage.setItem(STORAGE_KEY, "off")
          setArmed(false)
        }}
      >
        <BellRingingIcon aria-hidden="true" />
      </Button>
      <span className="sr-only" aria-live="polite">
        {ringing ? label : ""}
      </span>
    </div>
  )
}
