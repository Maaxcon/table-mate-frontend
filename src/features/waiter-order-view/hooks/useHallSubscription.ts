import { useEffect, useRef, useCallback } from "react"
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

export type HallEvent = HallTableStatusChangedEvent | HallNewReservationEvent

interface UseHallSubscriptionOptions {
  onTableStatusChanged?: (event: HallTableStatusChangedEvent) => void
  onNewReservation?: (event: HallNewReservationEvent) => void
  onError?: (error: Event) => void
  onClose?: () => void
}

export function useHallSubscription({
  onTableStatusChanged,
  onNewReservation,
  onError,
  onClose,
}: UseHallSubscriptionOptions) {
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const connectRef = useRef<(() => void) | undefined>(undefined)

  const callbacksRef = useRef({
    onTableStatusChanged,
    onNewReservation,
    onError,
    onClose,
  })

  useEffect(() => {
    callbacksRef.current = {
      onTableStatusChanged,
      onNewReservation,
      onError,
      onClose,
    }
  }, [onTableStatusChanged, onNewReservation, onError, onClose])

  const connect = useCallback(() => {
    if (!accessToken || env.wsUrl === "Not configured") return

    const ws = new WebSocket(`${env.wsUrl}/hall/?token=${accessToken}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.debug("[HallWS] Connected")
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as HallEvent
        if (data.event_name === "HALL_TABLE_STATUS_CHANGED") {
          callbacksRef.current.onTableStatusChanged?.(data)
        } else if (data.event_name === "HALL_NEW_RESERVATION") {
          callbacksRef.current.onNewReservation?.(data)
        }
      } catch (err) {
        console.error("[HallWS] Failed to parse message:", err)
      }
    }

    ws.onerror = (event) => {
      console.error("[HallWS] Error:", event)
      callbacksRef.current.onError?.(event)
    }

    ws.onclose = (event) => {
      console.debug("[HallWS] Disconnected:", event.code, event.reason)
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
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

  return { disconnect }
}
