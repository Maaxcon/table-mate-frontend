import { useCallback, useEffect, useRef, useState } from "react"
import { refreshAccessToken } from "@/api/client"
import { ENV_NOT_CONFIGURED_VALUE, env } from "@/config/env"
import { store } from "@/store"
import { clearAuth } from "@/store/auth/authSlice"
import type { NotificationEvent, WSNotificationMessage } from "../types"
import { getStream, formatEvent } from "../types"
import { notifyKitchenEvent } from "../kitchenEventBus"
import { notifyWaiterCallEvent } from "../waiterCallEventBus"

const DEFAULT_STREAM_LIMIT = 50
const STREAM_LIMITS: Record<string, number> = {
  client: 50,
  kitchen: 50,
}
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000
const DEFAULT_READ_IDS_STORAGE_KEY = "tablemate.staff.notifications.read"
// Waiter-call dismissals are shared across every staff page (kitchen, waiter
// view, ...) regardless of that page's own readStorageKey, so dismissing the
// popup on one screen stops the alert from re-firing when another screen's
// hook instance reconnects and gets the same event replayed to it.
const WAITER_READ_IDS_STORAGE_KEY = "tablemate.staff.waiterCalls.read"

function loadStoredIds(storage: Storage | null, key: string): string[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string")
  } catch {
    return []
  }
}

// `extraKnownIds` re-includes every waiter id this tab already believes is
// read (not just the new one) on every write. Two tabs dismissing different
// calls at nearly the same moment can otherwise race a plain read-then-write
// and silently drop one tab's update; folding in what this tab already knows
// makes the next write from either tab self-heal the lost id instead of
// leaving it lost until that specific tab writes again.
function addWaiterReadId(
  storage: Storage | null,
  eventId: string,
  extraKnownIds: Iterable<string> = [],
): void {
  if (!storage) return
  try {
    const existing = new Set(loadStoredIds(storage, WAITER_READ_IDS_STORAGE_KEY))
    for (const id of extraKnownIds) existing.add(id)
    existing.add(eventId)
    storage.setItem(WAITER_READ_IDS_STORAGE_KEY, JSON.stringify([...existing]))
  } catch {
    // ignore storage failures
  }
}

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
    // Waiter-call reads are merged in from a page-independent key: dismissing
    // the popup on one staff screen must also silence it on every other one.
    const ids = [
      ...loadStoredIds(storage, readStorageKey),
      ...loadStoredIds(storage, WAITER_READ_IDS_STORAGE_KEY),
    ]
    if (ids.length === 0) return
    readIdsRef.current = new Set(ids)
    if (eventsRef.current.length > 0) {
      const nextEvents = eventsRef.current.map((event) =>
        readIdsRef.current.has(event.id) ? { ...event, read: true } : event,
      )
      eventsRef.current = nextEvents
      setEvents(nextEvents)
    }
  }, [storage, readStorageKey])

  // Picks up dismissals made in other tabs/windows as soon as they happen,
  // instead of only at the next mount — narrows the window in which two
  // tabs' near-simultaneous writes could otherwise race each other.
  useEffect(() => {
    if (!storage) return
    const onStorage = (event: StorageEvent) => {
      if (event.key !== readStorageKey && event.key !== WAITER_READ_IDS_STORAGE_KEY) return
      const ids = [
        ...loadStoredIds(storage, readStorageKey),
        ...loadStoredIds(storage, WAITER_READ_IDS_STORAGE_KEY),
      ]
      let changed = false
      for (const id of ids) {
        if (!readIdsRef.current.has(id)) {
          readIdsRef.current.add(id)
          changed = true
        }
      }
      if (!changed) return
      const nextEvents = eventsRef.current.map((e) =>
        readIdsRef.current.has(e.id) ? { ...e, read: true } : e,
      )
      eventsRef.current = nextEvents
      setEvents(nextEvents)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
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

  const knownWaiterReadIds = useCallback(
    () =>
      eventsRef.current
        .filter((event) => event.stream === "waiter" && readIdsRef.current.has(event.id))
        .map((event) => event.id),
    [],
  )

  const markEventRead = useCallback(
    (eventId: string) => {
      if (readIdsRef.current.has(eventId)) return
      readIdsRef.current.add(eventId)
      persistReadIds()
      const target = eventsRef.current.find((event) => event.id === eventId)
      if (target?.stream === "waiter") addWaiterReadId(storage, eventId, knownWaiterReadIds())
      const nextEvents = eventsRef.current.map((event) =>
        event.id === eventId ? { ...event, read: true } : event,
      )
      eventsRef.current = nextEvents
      setEvents(nextEvents)
    },
    [persistReadIds, storage, knownWaiterReadIds],
  )

  const markAllRead = useCallback(() => {
    let changed = false
    const knownIds = knownWaiterReadIds()
    const nextEvents = eventsRef.current.map((event) => {
      if (event.read) return event
      changed = true
      if (event.stream === "waiter") addWaiterReadId(storage, event.id, knownIds)
      return { ...event, read: true }
    })
    if (!changed) return
    eventsRef.current = nextEvents
    nextEvents.forEach((event) => readIdsRef.current.add(event.id))
    setEvents(nextEvents)
    persistReadIds()
  }, [persistReadIds, storage, knownWaiterReadIds])

  const flushPendingEvents = useCallback(() => {
    flushTimeoutRef.current = null
    if (pendingEventsRef.current.length === 0) return
    const queue = pendingEventsRef.current
    pendingEventsRef.current = []
    queue.forEach((event) => {
      const isNewEvent = upsertEvent(event)
      // A reconnect (page switch, dropped socket, ...) replays recent events
      // to the fresh hook instance, so "new to this instance" alone isn't
      // enough — skip anything already dismissed, or every replay would
      // re-trigger the alert.
      const isUnread = !readIdsRef.current.has(event.id)
      if (isNewEvent && isUnread && event.stream === "kitchen") {
        notifyKitchenEvent()
      }
      if (isNewEvent && isUnread && event.stream === "waiter") {
        notifyWaiterCallEvent()
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
