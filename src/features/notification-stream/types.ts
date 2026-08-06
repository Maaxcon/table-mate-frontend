export type StreamType = "client" | "kitchen" | "waiter"

export type ClientEventType = "CART_CREATED" | "CART_CHECKED_OUT" | "HALL_NEW_RESERVATION"

export type KitchenEventType = "ORDER_ITEM_STATUS_CHANGED" | "KITCHEN_TICKET_INJECTED"

export type WaiterEventType = "WAITER_CALLED"

export type KnownWSMessageType = ClientEventType | KitchenEventType | WaiterEventType

export type WSMessageType = KnownWSMessageType | string

export interface WSNotificationData {
  id?: string
  reservation_id?: string
  session_id?: string
  table_number?: string
  guest_name?: string
  guest_count?: number
  menu_item_name?: string
  status?: string
  items_count?: number
  ticket_id?: string
  order_item_id?: string
  timestamp: string
}

export interface WSNotificationMessage {
  type: WSMessageType
  data: WSNotificationData
}

export interface NotificationEvent {
  id: string
  type: WSMessageType
  stream: StreamType
  title: string
  description: string
  tableNumber?: string
  sessionId?: string
  reservationId?: string
  timestamp: Date
  read: boolean
}

const CLIENT_EVENTS = new Set<KnownWSMessageType>([
  "CART_CREATED",
  "CART_CHECKED_OUT",
  "HALL_NEW_RESERVATION",
])

const KITCHEN_EVENTS = new Set<KnownWSMessageType>([
  "ORDER_ITEM_STATUS_CHANGED",
  "KITCHEN_TICKET_INJECTED",
])

const WAITER_EVENTS = new Set<KnownWSMessageType>(["WAITER_CALLED"])

function inferStreamFromType(type: string): StreamType | null {
  if (type.includes("WAITER")) return "waiter"
  if (type.includes("KITCHEN") || type.includes("TICKET") || type.includes("ORDER_"))
    return "kitchen"
  if (type.includes("CART") || type.includes("HALL") || type.includes("RESERVATION"))
    return "client"
  return null
}

export function getStream(type: WSMessageType): StreamType | null {
  if (CLIENT_EVENTS.has(type as KnownWSMessageType)) return "client"
  if (KITCHEN_EVENTS.has(type as KnownWSMessageType)) return "kitchen"
  if (WAITER_EVENTS.has(type as KnownWSMessageType)) return "waiter"
  return inferStreamFromType(type)
}

function humanizeFallbackTitle(type: string): string {
  return type
    .toLowerCase()
    .split(/[_\s]+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
}

function fallbackDescription(data: WSNotificationData): string {
  if (data.table_number && data.menu_item_name && data.status) {
    return `Table ${data.table_number} — ${data.menu_item_name} → ${data.status}`
  }
  if (data.table_number && data.status) {
    return `Table ${data.table_number} — ${data.status}`
  }
  if (data.table_number) {
    return `Table ${data.table_number}`
  }
  if (data.ticket_id) {
    return `Ticket ${data.ticket_id}`
  }
  if (data.session_id) {
    return `Session ${data.session_id}`
  }
  return ""
}

export function formatEvent(
  type: WSMessageType,
  data: WSNotificationData,
): {
  title: string
  description: string
} {
  const titles: Record<KnownWSMessageType, string> = {
    CART_CREATED: "Cart started",
    CART_CHECKED_OUT: "Cart checked out",
    HALL_NEW_RESERVATION: "New reservation",
    ORDER_ITEM_STATUS_CHANGED: "Item status changed",
    KITCHEN_TICKET_INJECTED: "New ticket",
    WAITER_CALLED: "Waiter called",
  }

  const descriptions: Record<KnownWSMessageType, string> = {
    CART_CREATED: `Table ${data.table_number} — ${data.guest_name ?? "Guest"}`,
    CART_CHECKED_OUT: `Table ${data.table_number}`,
    HALL_NEW_RESERVATION: `Table ${data.table_number} — ${data.guest_name ?? "Guest"}, ${data.guest_count} guests`,
    ORDER_ITEM_STATUS_CHANGED: `Table ${data.table_number} — ${data.menu_item_name ?? "Item"} → ${data.status}`,
    KITCHEN_TICKET_INJECTED: `Table ${data.table_number} — ${data.items_count ?? 0} item(s)`,
    WAITER_CALLED: `Table ${data.table_number} — ${data.guest_name ?? "Guest"} needs a waiter`,
  }

  const title = titles[type as KnownWSMessageType] ?? humanizeFallbackTitle(type)
  const description = descriptions[type as KnownWSMessageType] ?? fallbackDescription(data)

  return { title, description }
}
