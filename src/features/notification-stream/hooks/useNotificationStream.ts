import { useCallback, useEffect, useRef, useState } from "react"
import { refreshAccessToken } from "@/api/client"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { store } from "@/store"
import { clearAuth } from "@/store/auth/authSlice"
import type { NotificationEvent, WSNotificationMessage } from "../types"
import { getStream, formatEvent } from "../types"

const MAX_EVENTS = 50
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000

function jitter(delay: number): number {
  return delay * (0.5 + Math.random() * 0.5)
}

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `evt-${Date.now()}-${idCounter}`
}

function parseMessage(msg: WSNotificationMessage): NotificationEvent | null {
  const { title, description } = formatEvent(msg.type, msg.data)
  return {
    id: nextId(),
    type: msg.type,
    stream: getStream(msg.type),
    title,
    description,
    tableNumber: msg.data.table_number,
    sessionId: msg.data.session_id,
    reservationId: msg.data.reservation_id,
    timestamp: new Date(msg.data.timestamp),
  }
}

export function useNotificationStream() {
  const [events, setEvents] = useState<NotificationEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const mountedRef = useRef(true)
  const connectRef = useRef<() => void>(() => {})

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const accessToken = store.getState().auth.accessToken
    if (!accessToken) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    cleanup()

    if (env.wsUrl === ENV_NOT_CONFIGURED_VALUE) return

    const url = `${env.wsUrl}/staff/notifications/`
    const ws = new WebSocket(url, ["access_token", accessToken])
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close()
        return
      }
      attemptRef.current = 0
      setIsConnected(true)
    }

    ws.onclose = (event) => {
      if (!mountedRef.current) return
      setIsConnected(false)
      wsRef.current = null

      if (event.code === 4003) return

      if (event.code === 4001) {
        ;(async () => {
          try {
            await refreshAccessToken()
            if (mountedRef.current) connectRef.current()
          } catch {
            store.dispatch(clearAuth())
          }
        })()
        return
      }

      attemptRef.current += 1
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attemptRef.current - 1), MAX_DELAY_MS)
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connectRef.current()
      }, jitter(delay))
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSNotificationMessage
        const notificationEvent = parseMessage(msg)
        if (notificationEvent) {
          setEvents((prev) => [notificationEvent, ...prev].slice(0, MAX_EVENTS))
        }
      } catch {
        // ignore malformed messages
      }
    }
  }, [cleanup])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [connect, cleanup])

  return { events, isConnected }
}
