import type { OrderItem } from "@/types/api/types.gen"
import type { KitchenTicket } from "./api"
import type { KanbanItem, KanbanTicket } from "./types"

export function elapsedMinutes(startedAt: number): number {
  return Math.floor((Date.now() - startedAt) / 60000)
}

export function timerUrgencyClass(elapsed: number): string {
  if (elapsed >= 10) return "kanban-card__timer--danger"
  if (elapsed >= 5) return "kanban-card__timer--warning"
  return ""
}

export function mapItem(item: OrderItem): KanbanItem {
  return {
    id: item.public_id,
    name: item.menu_item_name,
    quantity: item.quantity,
    modifiers: item.comment ?? undefined,
    status: item.status === "ready" ? "ready" : "pending",
  }
}

export function mapTicket(ticket: KitchenTicket, items: OrderItem[]): KanbanTicket {
  const ticketItems = items.filter((it) => it.ticket === ticket.public_id)
  return {
    id: ticket.public_id,
    label: ticket.label || ticket.public_id.slice(0, 8),
    status: (ticket.status ?? "incoming") as KanbanTicket["status"],
    startedAt:
      ticket.status === "incoming"
        ? new Date(ticket.injected_at).getTime()
        : new Date(ticket.started_at ?? ticket.injected_at).getTime(),
    guestCount: ticket.guest_count,
    serverName: ticket.server_name,
    completedMinutes:
      ticket.completed_at && ticket.started_at
        ? Math.round(
            (new Date(ticket.completed_at).getTime() - new Date(ticket.started_at).getTime()) /
              60000,
          )
        : undefined,
    items: ticketItems.map(mapItem),
  }
}

export function mapTicketShort(ticket: KitchenTicket): KanbanTicket {
  return {
    id: ticket.public_id,
    label: ticket.label || ticket.public_id.slice(0, 8),
    status: "completed",
    startedAt: new Date(ticket.started_at ?? ticket.injected_at).getTime(),
    guestCount: ticket.guest_count,
    serverName: ticket.server_name,
    completedMinutes:
      ticket.completed_at && ticket.started_at
        ? Math.round(
            (new Date(ticket.completed_at).getTime() - new Date(ticket.started_at).getTime()) /
              60000,
          )
        : undefined,
    items: [],
  }
}
