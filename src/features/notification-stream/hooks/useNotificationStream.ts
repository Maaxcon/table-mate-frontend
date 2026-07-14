import { useCallback, useEffect, useRef, useState } from "react"
import { refreshAccessToken } from "@/api/client"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { store } from "@/store"
import { clearAuth } from "@/store/auth/authSlice"
import type { NotificationEvent, WSNotificationMessage } from "../types"
import { getStream, formatEvent } from "../types"
import { notifyKitchenEvent } from "../kitchenEventBus"

const MAX_EVENTS = 50
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000
const DEFAULT_READ_IDS_STORAGE_KEY = "tablemate.staff.notifications.read"

function jitter(delay: number): number {
  return delay * (0.5 + Math.random() * 0.5)
}

function parseMessage(msg: WSNotificationMessage): NotificationEvent | null {
  const stream = getStream(msg.type)
  if (!stream && import.meta.env.DEV) console.warn("unknown notification type:", msg.type)
  const { title, description } = formatEvent(msg.type, msg.data)
  return {
    id: msg.data.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: msg.type,
    stream: stream ?? "client",
    title,
    description,
    tableNumber: msg.data.table_number,
    sessionId: msg.data.session_id,
    reservationId: msg.data.reservation_id,
    timestamp: new Date(msg.data.timestamp),
    read: false,
  }
}

type NotificationStreamOptions = {
  readStorageKey?: string
}

export function useNotificationStream(options: NotificationStreamOptions = {}) {
  const [events, setEvents] = useState<NotificationEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const mountedRef = useRef(true)
  const connectRef = useRef<() => void>(() => {})
  const eventsRef = useRef<NotificationEvent[]>([])
  const pendingEventsRef = useRef<NotificationEvent[]>([])
  const readIdsRef = useRef<Set<string>>(new Set())
  const storage = typeof window !== "undefined" ? (window.localStorage ?? null) : null
  const readStorageKey = options.readStorageKey ?? DEFAULT_READ_IDS_STORAGE_KEY

  const persistReadIds = useCallback(() => {
    if (!storage) return
    try {
      storage.setItem(readStorageKey, JSON.stringify([...readIdsRef.current]))
    } catch {
      // ignore storage failures
    }
  }, [storage, readStorageKey])

  useEffect(() => {
    if (!storage) return
    try {
      const raw = storage.getItem(readStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const validIds = parsed.filter((id): id is string => typeof id === "string")
      readIdsRef.current = new Set(validIds)
      if (eventsRef.current.length > 0) {
        const nextEvents = eventsRef.current.map((event) =>
          readIdsRef.current.has(event.id) ? { ...event, read: true } : event,
        )
        eventsRef.current = nextEvents
        setEvents(nextEvents)
      }
    } catch {
      // ignore corrupted storage
    }
  }, [storage, readStorageKey])

  const upsertEvent = useCallback((incoming: NotificationEvent) => {
    const normalized = readIdsRef.current.has(incoming.id) ? { ...incoming, read: true } : incoming
    const existingIndex = eventsRef.current.findIndex((event) => event.id === normalized.id)
    const withoutExisting =
      existingIndex === -1
        ? eventsRef.current
        : [
            ...eventsRef.current.slice(0, existingIndex),
            ...eventsRef.current.slice(existingIndex + 1),
          ]
    const nextEvents = [normalized, ...withoutExisting].slice(0, MAX_EVENTS)
    eventsRef.current = nextEvents
    setEvents(nextEvents)
    return existingIndex === -1
  }, [])

  const markEventRead = useCallback(
    (eventId: string) => {
      if (readIdsRef.current.has(eventId)) return
      readIdsRef.current.add(eventId)
      persistReadIds()
      const nextEvents = eventsRef.current.map((event) =>
        event.id === eventId ? { ...event, read: true } : event,
      )
      eventsRef.current = nextEvents
      setEvents(nextEvents)
    },
    [persistReadIds],
  )

  const markAllRead = useCallback(() => {
    let changed = false
    const nextEvents = eventsRef.current.map((event) => {
      if (event.read) return event
      changed = true
      return { ...event, read: true }
    })
    if (!changed) return
    eventsRef.current = nextEvents
    nextEvents.forEach((event) => readIdsRef.current.add(event.id))
    setEvents(nextEvents)
    persistReadIds()
  }, [persistReadIds])

  const flushPendingEvents = useCallback(() => {
    flushTimeoutRef.current = null
    if (pendingEventsRef.current.length === 0) return
    const queue = pendingEventsRef.current
    pendingEventsRef.current = []
    queue.forEach((event) => {
      const isNewEvent = upsertEvent(event)
      if (isNewEvent && event.stream === "kitchen") {
        notifyKitchenEvent()
      }
    })
  }, [upsertEvent, notifyKitchenEvent])

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current != null) return
    flushTimeoutRef.current = setTimeout(flushPendingEvents, 0)
  }, [flushPendingEvents])

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = null
    }
    pendingEventsRef.current = []
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
          pendingEventsRef.current.push(notificationEvent)
          scheduleFlush()
        }
      } catch {
        // ignore malformed messages
      }
    }
  }, [cleanup, scheduleFlush])

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

  const unreadCount = events.reduce((count, event) => (!event.read ? count + 1 : count), 0)

  return { events, isConnected, unreadCount, markEventRead, markAllRead }
}
