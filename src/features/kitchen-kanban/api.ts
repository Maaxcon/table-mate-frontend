import { api } from "@/api/client"
import type {
  OrderItem,
  OrderItemStatusEnum,
  Ticket,
  TicketStatusEnum,
} from "@/types/api/types.gen"

export type { OrderItem }

/**
 * Kitchen tickets are read from the generated API schema. The board never
 * mutates server-owned fields (`label`, `daily_number`, etc.), so reuse the
 * generated `Ticket` type verbatim — including its `readonly` markers —
 * instead of hand-rolling a parallel interface that can drift.
 */
export type KitchenTicket = Ticket

const TICKETS_PATH = "/api/orders/tickets/"
const ORDER_ITEMS_PATH = "/api/orders/order-items/"

export interface TicketStats {
  avg_prep_time_seconds: number | null
}

export function fetchTicketStats(signal?: AbortSignal): Promise<TicketStats> {
  return api.get<TicketStats>(`${TICKETS_PATH}stats/`, { signal })
}

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
