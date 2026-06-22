import { useCallback, useEffect, useRef, useState } from "react"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { store } from "@/store"
import type { NotificationEvent, WSNotificationMessage, WSMessageType } from "../types"
import { getStream, formatEvent, type WSNotificationData } from "../types"

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

const MOCK_TABLES = ["3", "7", "12", "5", "9"]
const MOCK_GUESTS = ["Alice", "Bob", "Carol", "Dave", "Eve"]
const MOCK_ITEMS = ["Burger", "Pizza", "Pasta", "Salad", "Steak"]

const MOCK_EVENTS: { type: WSMessageType; data: WSNotificationData }[] = [
  {
    type: "HALL_NEW_RESERVATION",
    data: {
      table_number: "3",
      guest_name: "Alice",
      guest_count: 4,
      timestamp: new Date().toISOString(),
    },
  },
  {
    type: "CART_CREATED",
    data: { table_number: "7", guest_name: "Bob", timestamp: new Date().toISOString() },
  },
  {
    type: "CART_CHECKED_OUT",
    data: { table_number: "12", guest_name: "Carol", timestamp: new Date().toISOString() },
  },
  {
    type: "KITCHEN_TICKET_INJECTED",
    data: { table_number: "5", items_count: 3, timestamp: new Date().toISOString() },
  },
  {
    type: "ORDER_ITEM_STATUS_CHANGED",
    data: {
      table_number: "9",
      menu_item_name: "Burger",
      status: "ready",
      timestamp: new Date().toISOString(),
    },
  },
]

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomMockEvent(): WSNotificationMessage {
  const base = randomPick(MOCK_EVENTS)
  return {
    type: base.type,
    data: {
      ...base.data,
      table_number: randomPick(MOCK_TABLES),
      guest_name: randomPick(MOCK_GUESTS),
      menu_item_name: randomPick(MOCK_ITEMS),
      guest_count: Math.floor(Math.random() * 6) + 1,
      items_count: Math.floor(Math.random() * 5) + 1,
      status: randomPick(["pending", "in_progress", "ready"]),
      timestamp: new Date().toISOString(),
    },
  }
}

export function useNotificationStream({ mock = false }: { mock?: boolean } = {}) {
  const [events, setEvents] = useState<NotificationEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const mountedRef = useRef(true)
  const connectRef = useRef<() => void>(() => {})
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
    }
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

    if (mock) {
      setTimeout(() => {
        if (mountedRef.current) setIsConnected(true)
      }, 0)
      mockIntervalRef.current = setInterval(() => {
        if (!mountedRef.current) {
          if (mockIntervalRef.current) clearInterval(mockIntervalRef.current)
          return
        }
        const msg = randomMockEvent()
        const notificationEvent = parseMessage(msg)
        if (notificationEvent) {
          setEvents((prev) => [notificationEvent, ...prev].slice(0, MAX_EVENTS))
        }
      }, 4000)
      return
    }

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

      if (event.code === 4003 || event.code === 4001) return

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
  }, [cleanup, mock])

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
