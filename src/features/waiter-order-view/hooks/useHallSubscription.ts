import { useEffect, useRef, useCallback, useState } from "react"
import { env } from "@/config/env"
import { useAppSelector } from "@/store/hooks"

export interface HallTableStatusChangedEvent {
  event_name: "HALL_TABLE_STATUS_CHANGED"
  schema_version: string
  event_id: string
  table_id: string
  previous_status: string
  current_status: string
  session_id: string | null
  actor_id: number
  actor_role: string
  occurred_at: string
}

export interface HallNewReservationEvent {
  event_name: "HALL_NEW_RESERVATION"
  schema_version: string
  event_id: string
  reservation_id: string
  table_id: string
  start_at: string
  end_at: string
  actor_id: number
  actor_role: string
  occurred_at: string
}

export interface HallReservationCancelledEvent {
  event_name: "HALL_RESERVATION_CANCELLED"
  schema_version: string
  event_id: string
  reservation_id: string
  table_id: string
  actor_id: number
  actor_role: string
  occurred_at: string
}

export interface HallLayoutPublishedEvent {
  event_name: "LAYOUT_PUBLISHED"
  schema_version: string
  event_id: string
  layout_version_public_id: string
  restaurant_public_id: string
  occurred_at: string
}

export interface HallZoneCreatedEvent {
  event_name: "ZONE_CREATED"
  schema_version: string
  event_id: string
  zone_public_id: string
  zone_name: string
  occurred_at: string
}

export interface HallZoneUpdatedEvent {
  event_name: "ZONE_UPDATED"
  schema_version: string
  event_id: string
  zone_public_id: string
  zone_name: string
  occurred_at: string
}

export interface HallZoneDeletedEvent {
  event_name: "ZONE_DELETED"
  schema_version: string
  event_id: string
  zone_public_id: string
  occurred_at: string
}

export interface HallReservationsUpdatedEvent {
  event_name: "HALL_RESERVATIONS_UPDATED"
  schema_version: string
  table_ids: string[]
  occurred_at: string
}

export type HallEvent =
  | HallTableStatusChangedEvent
  | HallNewReservationEvent
  | HallReservationCancelledEvent
  | HallLayoutPublishedEvent
  | HallZoneCreatedEvent
  | HallZoneUpdatedEvent
  | HallZoneDeletedEvent
  | HallReservationsUpdatedEvent

interface UseHallSubscriptionOptions {
  onTableStatusChanged?: (event: HallTableStatusChangedEvent) => void
  onNewReservation?: (event: HallNewReservationEvent) => void
  onReservationCancelled?: (event: HallReservationCancelledEvent) => void
  onReservationsUpdated?: (event: HallReservationsUpdatedEvent) => void
  onLayoutPublished?: (event: HallLayoutPublishedEvent) => void
  onZoneCreated?: (event: HallZoneCreatedEvent) => void
  onZoneUpdated?: (event: HallZoneUpdatedEvent) => void
  onZoneDeleted?: (event: HallZoneDeletedEvent) => void
  onError?: (error: Event) => void
  onClose?: () => void
}

export function useHallSubscription({
  onTableStatusChanged,
  onNewReservation,
  onReservationCancelled,
  onReservationsUpdated,
  onLayoutPublished,
  onZoneCreated,
  onZoneUpdated,
  onZoneDeleted,
  onError,
  onClose,
}: UseHallSubscriptionOptions) {
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const connectRef = useRef<(() => void) | undefined>(undefined)
  const tokenRef = useRef(accessToken)
  const mountedRef = useRef(false)

  const callbacksRef = useRef({
    onTableStatusChanged,
    onNewReservation,
    onReservationCancelled,
    onReservationsUpdated,
    onLayoutPublished,
    onZoneCreated,
    onZoneUpdated,
    onZoneDeleted,
    onError,
    onClose,
  })

  useEffect(() => {
    callbacksRef.current = {
      onTableStatusChanged,
      onNewReservation,
      onReservationCancelled,
      onReservationsUpdated,
      onLayoutPublished,
      onZoneCreated,
      onZoneUpdated,
      onZoneDeleted,
      onError,
      onClose,
    }
  }, [
    onTableStatusChanged,
    onNewReservation,
    onReservationCancelled,
    onReservationsUpdated,
    onLayoutPublished,
    onZoneCreated,
    onZoneUpdated,
    onZoneDeleted,
    onError,
    onClose,
  ])

  const connect = useCallback(() => {
    if (!accessToken || env.wsUrl === "Not configured") return

    const ws = new WebSocket(`${env.wsUrl}/hall/?token=${accessToken}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      console.debug("[HallWS] Connected")
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as HallEvent
        if (data.event_name === "HALL_TABLE_STATUS_CHANGED") {
          callbacksRef.current.onTableStatusChanged?.(data)
        } else if (data.event_name === "HALL_NEW_RESERVATION") {
          callbacksRef.current.onNewReservation?.(data)
        } else if (data.event_name === "HALL_RESERVATION_CANCELLED") {
          callbacksRef.current.onReservationCancelled?.(data)
        } else if (data.event_name === "HALL_RESERVATIONS_UPDATED") {
          callbacksRef.current.onReservationsUpdated?.(data as HallReservationsUpdatedEvent)
        } else if (data.event_name === "LAYOUT_PUBLISHED") {
          callbacksRef.current.onLayoutPublished?.(data)
        } else if (data.event_name === "ZONE_CREATED") {
          callbacksRef.current.onZoneCreated?.(data)
        } else if (data.event_name === "ZONE_UPDATED") {
          callbacksRef.current.onZoneUpdated?.(data)
        } else if (data.event_name === "ZONE_DELETED") {
          callbacksRef.current.onZoneDeleted?.(data)
        }
      } catch (err) {
        console.error("[HallWS] Failed to parse message:", err)
      }
    }

    ws.onerror = (event) => {
      // A socket torn down on unmount (StrictMode's double-mount in dev) fires a
      // detail-less error event — ignore it; only surface errors while mounted.
      if (!mountedRef.current) return
      console.error("[HallWS] Error:", event)
      setIsConnected(false)
      callbacksRef.current.onError?.(event)
    }

    ws.onclose = (event) => {
      console.debug("[HallWS] Disconnected:", event.code, event.reason)
      wsRef.current = null
      if (!mountedRef.current) return
      setIsConnected(false)
      callbacksRef.current.onClose?.()

      if (event.code !== 1000 && tokenRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), 3000)
      }
    }
  }, [accessToken])

  useEffect(() => {
    tokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        // Detach handlers first so the teardown close doesn't fire onerror/onclose
        // (which would otherwise log a spurious error and schedule a reconnect).
        wsRef.current.onerror = null
        wsRef.current.onclose = null
        wsRef.current.close(1000, "Component unmounting")
        wsRef.current = null
      }
    }
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect")
      wsRef.current = null
    }
  }, [])

  return { disconnect, isConnected }
}
