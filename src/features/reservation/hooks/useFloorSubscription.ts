import { useEffect, useRef, useCallback } from "react"
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
  layout_version_id: number
  restaurant_id: number
  occurred_at: string
}

export type FloorEvent =
  | FloorTableStatusEvent
  | FloorNewReservationEvent
  | FloorReservationCancelledEvent
  | FloorLayoutPublishedEvent

interface UseFloorSubscriptionOptions {
  onTableStatusChanged?: (event: FloorTableStatusEvent) => void
  onNewReservation?: (event: FloorNewReservationEvent) => void
  onReservationCancelled?: (event: FloorReservationCancelledEvent) => void
  onLayoutPublished?: (event: FloorLayoutPublishedEvent) => void
  onClose?: () => void
  onError?: (error: Event) => void
}

export function useFloorSubscription({
  onTableStatusChanged,
  onNewReservation,
  onReservationCancelled,
  onLayoutPublished,
  onClose,
  onError,
  restaurantPublicId,
}: UseFloorSubscriptionOptions & { restaurantPublicId?: string }) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<(() => void) | undefined>(undefined)
  const callbacksRef = useRef({
    onTableStatusChanged,
    onNewReservation,
    onReservationCancelled,
    onLayoutPublished,
    onClose,
    onError,
  })

  useEffect(() => {
    callbacksRef.current = {
      onTableStatusChanged,
      onNewReservation,
      onReservationCancelled,
      onLayoutPublished,
      onClose,
      onError,
    }
  }, [
    onTableStatusChanged,
    onNewReservation,
    onReservationCancelled,
    onLayoutPublished,
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
      console.debug("[FloorWS] Connected")
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
        }
      } catch (err) {
        console.warn("[FloorWS] Failed to parse message:", err)
      }
    }

    ws.onerror = (error) => {
      console.error("[FloorWS] Error:", error)
      callbacksRef.current.onError?.(error)
    }

    ws.onclose = (event) => {
      console.debug("[FloorWS] Disconnected:", event.code, event.reason)
      wsRef.current = null
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
    connect()
    return () => {
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

  return { disconnect }
}
