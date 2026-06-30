import { useEffect, useRef, useCallback } from "react"
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
  occurred_at: string
}

export interface FloorReservationCancelledEvent {
  event_name: "HALL_RESERVATION_CANCELLED"
  reservation_id: string
  table_id: string
  occurred_at: string
}

export type FloorEvent =
  | FloorTableStatusEvent
  | FloorNewReservationEvent
  | FloorReservationCancelledEvent

interface UseFloorSubscriptionOptions {
  onTableStatusChanged?: (event: FloorTableStatusEvent) => void
  onNewReservation?: (event: FloorNewReservationEvent) => void
  onReservationCancelled?: (event: FloorReservationCancelledEvent) => void
  onClose?: () => void
  onError?: (error: Event) => void
  // Customers carry no restaurant in their token, so the restaurant they're
  // viewing is passed explicitly to scope the floor stream.
  restaurantId?: string | null
}

// Close codes the server uses to reject auth/scope — reconnecting would just loop.
const NO_RETRY_CLOSE_CODES = new Set([4001, 4003])

export function useFloorSubscription({
  onTableStatusChanged,
  onNewReservation,
  onReservationCancelled,
  onClose,
  onError,
  restaurantId,
}: UseFloorSubscriptionOptions) {
  const accessToken = useAppSelector((s) => s.auth.accessToken)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<(() => void) | null>(null)
  const callbacksRef = useRef({
    onTableStatusChanged,
    onNewReservation,
    onReservationCancelled,
    onClose,
    onError,
  })

  useEffect(() => {
    callbacksRef.current = {
      onTableStatusChanged,
      onNewReservation,
      onReservationCancelled,
      onClose,
      onError,
    }
  }, [onTableStatusChanged, onNewReservation, onReservationCancelled, onClose, onError])

  const connect = useCallback(() => {
    if (!accessToken || env.wsUrl === "Not configured") return

    if (wsRef.current) {
      wsRef.current.close(1000, "Reconnecting")
      wsRef.current = null
    }

    const params = new URLSearchParams({ token: accessToken })
    if (restaurantId) params.set("restaurant", restaurantId)
    const ws = new WebSocket(`${env.wsUrl}/floor/?${params}`)
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
        }
      } catch (err) {
        console.warn("[FloorWS] Failed to parse message:", err)
      }
    }

    ws.onerror = (error) => {
      console.debug("[FloorWS] Error:", error)
      callbacksRef.current.onError?.(error)
    }

    ws.onclose = (event) => {
      console.debug("[FloorWS] Disconnected:", event.code, event.reason)
      wsRef.current = null
      callbacksRef.current.onClose?.()

      // Retry transient drops, but never loop on auth/scope rejections.
      if (event.code !== 1000 && !NO_RETRY_CLOSE_CODES.has(event.code) && accessToken) {
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), 3000)
      }
    }
  }, [accessToken, restaurantId])

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
