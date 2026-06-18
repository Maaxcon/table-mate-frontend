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
  table_id: string
  occurred_at: string
}

export interface FloorReservationCancelledEvent {
  event_name: "HALL_RESERVATION_CANCELLED"
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
}

export function useFloorSubscription({
  onTableStatusChanged,
  onNewReservation,
  onReservationCancelled,
  onClose,
  onError,
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
    if (!accessToken || !env.wsUrl) return

    if (wsRef.current) {
      wsRef.current.close(1000, "Reconnecting")
      wsRef.current = null
    }

    const ws = new WebSocket(`${env.wsUrl}/floor/?token=${accessToken}`)
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
      console.error("[FloorWS] Error:", error)
      callbacksRef.current.onError?.(error)
    }

    ws.onclose = (event) => {
      console.debug("[FloorWS] Disconnected:", event.code, event.reason)
      wsRef.current = null
      callbacksRef.current.onClose?.()

      if (event.code !== 1000 && accessToken) {
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), 3000)
      }
    }
  }, [accessToken])

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
