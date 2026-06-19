import { api } from "@/api/client"
import type { OrderItem, OrderItemStatusEnum, TicketStatusEnum } from "@/types/api/types.gen"

export interface KitchenTicket {
  readonly public_id: string
  readonly restaurant: string
  session: string
  order: string
  status?: TicketStatusEnum
  injected_at: string
  started_at?: string | null
  completed_at?: string | null
  readonly created_at: string
  readonly updated_at: string
  table_number: string
  server_name: string
  guest_count: number
  items_count: number
}

const TICKETS_PATH = "/api/orders/tickets/"
const ORDER_ITEMS_PATH = "/api/orders/order-items/"

export function fetchTickets(
  status: TicketStatusEnum,
  signal?: AbortSignal,
): Promise<KitchenTicket[]> {
  return api.getList<KitchenTicket>(TICKETS_PATH, {
    signal,
    query: { status, ordering: "-injected_at" },
    errorMessage: "Could not load tickets.",
  })
}

export function fetchCompletedTickets(signal?: AbortSignal): Promise<KitchenTicket[]> {
  return api.getList<KitchenTicket>(TICKETS_PATH, {
    signal,
    query: { status: "completed", ordering: "-completed_at" },
    errorMessage: "Could not load tickets.",
  })
}

export function fetchOrderItems(orderPublicId: string, signal?: AbortSignal): Promise<OrderItem[]> {
  return api.getList<OrderItem>(ORDER_ITEMS_PATH, {
    signal,
    query: { order__public_id: orderPublicId },
    errorMessage: "Could not load order items.",
  })
}

export function updateTicketStatus(
  publicId: string,
  status: TicketStatusEnum,
): Promise<KitchenTicket> {
  return api.patch<KitchenTicket>(
    `${TICKETS_PATH}${publicId}/`,
    { status },
    {
      errorMessage: "Could not update ticket.",
    },
  )
}

export function updateOrderItemStatus(
  publicId: string,
  status: OrderItemStatusEnum,
): Promise<OrderItem> {
  return api.patch<OrderItem>(
    `${ORDER_ITEMS_PATH}${publicId}/`,
    { status },
    {
      errorMessage: "Could not update item.",
    },
  )
}
