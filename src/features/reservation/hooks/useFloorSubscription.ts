import { useEffect, useRef, useCallback, useState } from "react"
import { env } from "@/config/env"

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

export type FloorEvent =
  | FloorTableStatusEvent
  | FloorNewReservationEvent
  | FloorReservationCancelledEvent
  | FloorLayoutPublishedEvent
  | FloorZoneCreatedEvent
  | FloorZoneUpdatedEvent
  | FloorZoneDeletedEvent

interface UseFloorSubscriptionOptions {
  onTableStatusChanged?: (event: FloorTableStatusEvent) => void
  onNewReservation?: (event: FloorNewReservationEvent) => void
  onReservationCancelled?: (event: FloorReservationCancelledEvent) => void
  onLayoutPublished?: (event: FloorLayoutPublishedEvent) => void
  onZoneCreated?: (event: FloorZoneCreatedEvent) => void
  onZoneUpdated?: (event: FloorZoneUpdatedEvent) => void
  onZoneDeleted?: (event: FloorZoneDeletedEvent) => void
  onClose?: () => void
  onError?: (error: Event) => void
}

export function useFloorSubscription({
  onTableStatusChanged,
  onNewReservation,
  onReservationCancelled,
  onLayoutPublished,
  onZoneCreated,
  onZoneUpdated,
  onZoneDeleted,
  onClose,
  onError,
  restaurantPublicId,
}: UseFloorSubscriptionOptions & { restaurantPublicId?: string }) {
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
    onClose,
    onError,
  ])

  const connect = useCallback(() => {
    if (env.wsUrl === "Not configured" || !restaurantPublicId) return

    if (wsRef.current) {
      wsRef.current.close(1000, "Reconnecting")
      wsRef.current = null
    }

    const ws = new WebSocket(`${env.wsUrl}/floor/?restaurant_id=${restaurantPublicId}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      console.debug("[FloorWS] Connected")
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
        }
      } catch (err) {
        console.warn("[FloorWS] Failed to parse message:", err)
      }
    }

    ws.onerror = (error) => {
      console.error("[FloorWS] Error:", error)
      setIsConnected(false)
      callbacksRef.current.onError?.(error)
    }

    ws.onclose = (event) => {
      console.debug("[FloorWS] Disconnected:", event.code, event.reason)
      wsRef.current = null
      if (!mountedRef.current) return
      setIsConnected(false)
      callbacksRef.current.onClose?.()

      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), 3000)
      }
    }
  }, [restaurantPublicId])

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
        wsRef.current.close(1000, "Component unmounting")
        wsRef.current = null
      }
    }
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect")
      wsRef.current = null
    }
  }, [])

  return { disconnect, isConnected }
}
