export type StreamType = "client" | "kitchen"

export type ClientEventType = "CART_CREATED" | "CART_CHECKED_OUT" | "HALL_NEW_RESERVATION"

export type KitchenEventType = "ORDER_ITEM_STATUS_CHANGED" | "KITCHEN_TICKET_INJECTED"

export type WSMessageType = ClientEventType | KitchenEventType

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
}

const CLIENT_EVENTS = new Set<WSMessageType>([
  "CART_CREATED",
  "CART_CHECKED_OUT",
  "HALL_NEW_RESERVATION",
])

const KITCHEN_EVENTS = new Set<WSMessageType>([
  "ORDER_ITEM_STATUS_CHANGED",
  "KITCHEN_TICKET_INJECTED",
])

export function getStream(type: WSMessageType): StreamType {
  if (CLIENT_EVENTS.has(type)) return "client"
  if (KITCHEN_EVENTS.has(type)) return "kitchen"
  return "client"
}

export function formatEvent(
  type: WSMessageType,
  data: WSNotificationData,
): {
  title: string
  description: string
} {
  const titles: Record<WSMessageType, string> = {
    CART_CREATED: "Cart started",
    CART_CHECKED_OUT: "Cart checked out",
    HALL_NEW_RESERVATION: "New reservation",
    ORDER_ITEM_STATUS_CHANGED: "Item status changed",
    KITCHEN_TICKET_INJECTED: "New ticket",
  }

  const descriptions: Record<WSMessageType, string> = {
    CART_CREATED: `Table ${data.table_number} — ${data.guest_name ?? "Guest"}`,
    CART_CHECKED_OUT: `Table ${data.table_number}`,
    HALL_NEW_RESERVATION: `Table ${data.table_number} — ${data.guest_name ?? "Guest"}, ${data.guest_count} guests`,
    ORDER_ITEM_STATUS_CHANGED: `Table ${data.table_number} — ${data.menu_item_name ?? "Item"} → ${data.status}`,
    KITCHEN_TICKET_INJECTED: `Table ${data.table_number} — ${data.items_count ?? 0} item(s)`,
  }

  return {
    title: titles[type] ?? type,
    description: descriptions[type] ?? "",
  }
}
