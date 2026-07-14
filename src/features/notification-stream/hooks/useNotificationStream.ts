import { useCallback, useEffect, useRef, useState } from "react"
import { refreshAccessToken } from "@/api/client"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { store } from "@/store"
import { clearAuth } from "@/store/auth/authSlice"
import type { NotificationEvent, WSNotificationMessage } from "../types"
import { getStream, formatEvent } from "../types"
import { notifyKitchenEvent } from "../kitchenEventBus"
import { fetchNotificationHistory } from "../api"

const DEFAULT_STREAM_LIMIT = 50
const STREAM_LIMITS: Record<string, number> = {
  client: 50,
  kitchen: 50,
}
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
  const historyAbortRef = useRef<AbortController | null>(null)
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

  const enforceStreamLimits = useCallback((eventsToClamp: NotificationEvent[]) => {
    const counts = new Map<string, number>()
    const next: NotificationEvent[] = []
    for (const event of eventsToClamp) {
      const streamKey = event.stream ?? "default"
      const limit = STREAM_LIMITS[streamKey] ?? DEFAULT_STREAM_LIMIT
      const count = counts.get(streamKey) ?? 0
      if (count >= limit) continue
      counts.set(streamKey, count + 1)
      next.push(event)
    }
    return next
  }, [])

  const upsertEvent = useCallback(
    (incoming: NotificationEvent) => {
      const normalized = readIdsRef.current.has(incoming.id)
        ? { ...incoming, read: true }
        : incoming
      const existingIndex = eventsRef.current.findIndex((event) => event.id === normalized.id)
      const withoutExisting =
        existingIndex === -1
          ? eventsRef.current
          : [
              ...eventsRef.current.slice(0, existingIndex),
              ...eventsRef.current.slice(existingIndex + 1),
            ]
      const nextEvents = enforceStreamLimits([normalized, ...withoutExisting])
      eventsRef.current = nextEvents
      setEvents(nextEvents)
      return existingIndex === -1
    },
    [enforceStreamLimits],
  )

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

  const seedEvents = useCallback(
    (incoming: NotificationEvent[]) => {
      if (incoming.length === 0) return
      const merged = new Map<string, NotificationEvent>()
      for (const event of eventsRef.current) {
        const normalized = readIdsRef.current.has(event.id) ? { ...event, read: true } : event
        merged.set(normalized.id, normalized)
      }
      for (const event of incoming) {
        const normalized = readIdsRef.current.has(event.id) ? { ...event, read: true } : event
        merged.set(normalized.id, normalized)
      }
      const sorted = Array.from(merged.values()).sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      )
      const nextEvents = enforceStreamLimits(sorted)
      eventsRef.current = nextEvents
      setEvents(nextEvents)
    },
    [enforceStreamLimits],
  )

  const loadHistory = useCallback(() => {
    if (env.apiBaseUrl === ENV_NOT_CONFIGURED_VALUE) return
    if (!store.getState().auth.accessToken) return
    const controller = new AbortController()
    if (historyAbortRef.current) {
      historyAbortRef.current.abort()
    }
    historyAbortRef.current = controller
    ;(async () => {
      try {
        const history = await fetchNotificationHistory(controller.signal)
        const parsed = history
          .map((entry) => parseMessage(entry))
          .filter((event): event is NotificationEvent => event !== null)
        if (parsed.length === 0) return
        seedEvents(parsed)
      } catch (error) {
        if (controller.signal.aborted) return
        if (import.meta.env.DEV) {
          console.error("Failed to load notification history", error)
        }
      } finally {
        if (historyAbortRef.current === controller) {
          historyAbortRef.current = null
        }
      }
    })()
  }, [seedEvents])

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
  }, [upsertEvent])

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
    if (historyAbortRef.current) {
      historyAbortRef.current.abort()
      historyAbortRef.current = null
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
      loadHistory()
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
  }, [cleanup, scheduleFlush, loadHistory])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    loadHistory()
    connect()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [connect, cleanup, loadHistory])

  const unreadCount = events.reduce((count, event) => (!event.read ? count + 1 : count), 0)

  return { events, isConnected, unreadCount, markEventRead, markAllRead }
}
