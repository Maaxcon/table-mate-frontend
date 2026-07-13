import { useEffect, useRef, useCallback, useState } from "react"
import { env } from "@/config/env"
import { useAppSelector } from "@/store/hooks"

export interface FloorTableStatusEvent {
  event_name: "HALL_TABLE_STATUS_CHANGED"
  table_id: string
  current_status: string
  occurred_at: string
}

export interface FloorNewReservationEvent {
  event_name: "HALL_NEW_RESERVATION"
  reservation_id: string
  table_id: string
  start_at: string
  end_at: string
  occurred_at: string
}

export interface FloorReservationCancelledEvent {
  event_name: "HALL_RESERVATION_CANCELLED"
  reservation_id: string
  table_id: string
  occurred_at: string
}

export interface FloorLayoutPublishedEvent {
  event_name: "LAYOUT_PUBLISHED"
  layout_version_public_id: string
  restaurant_public_id: string
  occurred_at: string
}

export interface FloorZoneCreatedEvent {
  event_name: "ZONE_CREATED"
  zone_public_id: string
  zone_name: string
  occurred_at: string
}

export interface FloorZoneUpdatedEvent {
  event_name: "ZONE_UPDATED"
  zone_public_id: string
  zone_name: string
  occurred_at: string
}

export interface FloorZoneDeletedEvent {
  event_name: "ZONE_DELETED"
  zone_public_id: string
  occurred_at: string
}

export interface FloorReservationsUpdatedEvent {
  event_name: "HALL_RESERVATIONS_UPDATED"
  table_ids: string[]
  occurred_at: string
}

export type FloorEvent =
  | FloorTableStatusEvent
  | FloorNewReservationEvent
  | FloorReservationCancelledEvent
  | FloorLayoutPublishedEvent
  | FloorZoneCreatedEvent
  | FloorZoneUpdatedEvent
  | FloorZoneDeletedEvent
  | FloorReservationsUpdatedEvent

interface UseFloorSubscriptionOptions {
  onTableStatusChanged?: (event: FloorTableStatusEvent) => void
  onNewReservation?: (event: FloorNewReservationEvent) => void
  onReservationCancelled?: (event: FloorReservationCancelledEvent) => void
  onLayoutPublished?: (event: FloorLayoutPublishedEvent) => void
  onZoneCreated?: (event: FloorZoneCreatedEvent) => void
  onZoneUpdated?: (event: FloorZoneUpdatedEvent) => void
  onZoneDeleted?: (event: FloorZoneDeletedEvent) => void
  onReservationsUpdated?: (event: FloorReservationsUpdatedEvent) => void
  onClose?: () => void
  onError?: (error: Event) => void
  // Customers carry no restaurant in their token, so the restaurant they're
  // viewing is passed explicitly to scope the floor stream.
  restaurantId?: string | null
}

// Close codes the server uses to reject auth/scope — reconnecting would just loop.
const NO_RETRY_CLOSE_CODES = new Set([4001, 4003])

// WS diagnostics, dev-only so production consoles stay quiet.
const wsLog: (...args: unknown[]) => void = import.meta.env.DEV
  ? (...args) => console.debug("[FloorWS]", ...args)
  : () => {}

// Detach handlers before a deliberate close so the old socket's onclose can't
// fire after a replacement is installed (it would null the live socket's ref,
// leak it in the hall group, and let a reconnect double-deliver every event).
function closeSilently(ws: WebSocket, reason: string) {
  ws.onerror = null
  ws.onclose = null
  ws.close(1000, reason)
}

export function useFloorSubscription({
  onTableStatusChanged,
  onNewReservation,
  onReservationCancelled,
  onLayoutPublished,
  onZoneCreated,
  onZoneUpdated,
  onZoneDeleted,
  onReservationsUpdated,
  onClose,
  onError,
  restaurantId,
}: UseFloorSubscriptionOptions) {
  const accessToken = useAppSelector((s) => s.auth.accessToken)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<(() => void) | undefined>(undefined)
  const mountedRef = useRef(false)
  const callbacksRef = useRef({
    onTableStatusChanged,
    onNewReservation,
    onReservationCancelled,
    onLayoutPublished,
    onZoneCreated,
    onZoneUpdated,
    onZoneDeleted,
    onReservationsUpdated,
    onClose,
    onError,
  })

  useEffect(() => {
    callbacksRef.current = {
      onTableStatusChanged,
      onNewReservation,
      onReservationCancelled,
      onLayoutPublished,
      onZoneCreated,
      onZoneUpdated,
      onZoneDeleted,
      onReservationsUpdated,
      onClose,
      onError,
    }
  }, [
    onTableStatusChanged,
    onNewReservation,
    onReservationCancelled,
    onLayoutPublished,
    onZoneCreated,
    onZoneUpdated,
    onZoneDeleted,
    onReservationsUpdated,
    onClose,
    onError,
  ])

  const connect = useCallback(() => {
    if (env.wsUrl === "Not configured" || !restaurantId) return

    if (wsRef.current) {
      closeSilently(wsRef.current, "Reconnecting")
      wsRef.current = null
    }

    // The floor stream is public: anonymous guests connect with just the
    // restaurant param, a token only adds the (optional) identity/claim.
    const params = new URLSearchParams()
    if (restaurantId) params.set("restaurant", restaurantId)
    const ws = new WebSocket(
      `${env.wsUrl}/floor/?${params}`,
      accessToken ? ["access_token", accessToken] : undefined,
    )
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      wsLog("Connected")
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as FloorEvent
        if (data.event_name === "HALL_TABLE_STATUS_CHANGED") {
          callbacksRef.current.onTableStatusChanged?.(data as FloorTableStatusEvent)
        } else if (data.event_name === "HALL_NEW_RESERVATION") {
          callbacksRef.current.onNewReservation?.(data as FloorNewReservationEvent)
        } else if (data.event_name === "HALL_RESERVATION_CANCELLED") {
          callbacksRef.current.onReservationCancelled?.(data as FloorReservationCancelledEvent)
        } else if (data.event_name === "LAYOUT_PUBLISHED") {
          callbacksRef.current.onLayoutPublished?.(data as FloorLayoutPublishedEvent)
        } else if (data.event_name === "ZONE_CREATED") {
          callbacksRef.current.onZoneCreated?.(data as FloorZoneCreatedEvent)
        } else if (data.event_name === "ZONE_UPDATED") {
          callbacksRef.current.onZoneUpdated?.(data as FloorZoneUpdatedEvent)
        } else if (data.event_name === "ZONE_DELETED") {
          callbacksRef.current.onZoneDeleted?.(data as FloorZoneDeletedEvent)
        } else if (data.event_name === "HALL_RESERVATIONS_UPDATED") {
          callbacksRef.current.onReservationsUpdated?.(data as FloorReservationsUpdatedEvent)
        }
      } catch (err) {
        wsLog("Failed to parse message:", err)
      }
    }

    ws.onerror = (error) => {
      wsLog("Error:", error)
      setIsConnected(false)
      callbacksRef.current.onError?.(error)
    }

    ws.onclose = (event) => {
      wsLog("Disconnected:", event.code, event.reason)
      if (wsRef.current === ws) wsRef.current = null
      if (!mountedRef.current) return
      setIsConnected(false)
      callbacksRef.current.onClose?.()

      // Retry transient drops (guests included — the stream is public), but
      // never loop on auth/scope rejections.
      if (event.code !== 1000 && !NO_RETRY_CLOSE_CODES.has(event.code)) {
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), 3000)
      }
    }
  }, [accessToken, restaurantId])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        closeSilently(wsRef.current, "Component unmounting")
        wsRef.current = null
      }
    }
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (wsRef.current) {
      closeSilently(wsRef.current, "Manual disconnect")
      wsRef.current = null
      setIsConnected(false)
    }
  }, [])

  return { disconnect, isConnected }
}
