import { useCallback, useEffect, useMemo, useState } from "react"
import "./KitchenKanban.css"
import { onKitchenEvent } from "@/features/notification-stream/kitchenEventBus"
import {
  fetchTickets,
  fetchCompletedTickets,
  fetchOrderItems,
  fetchTicketStats,
  updateTicketStatus,
  updateOrderItemStatus,
  type KitchenTicket,
} from "./api"
import type { OrderItem } from "@/types/api/types.gen"
import type { BatchCount, KanbanItem, KanbanTicket } from "./types"
import { elapsedMinutes } from "./utils"
import { KanbanHeader } from "./components/KanbanHeader"
import { IncomingColumn } from "./components/IncomingColumn"
import { ActiveColumn } from "./components/ActiveColumn"
import { BatchColumn } from "./components/BatchColumn"
import { CompletedColumn } from "./components/CompletedColumn"
import { KanbanFooter } from "./components/KanbanFooter"

function mapItem(item: OrderItem): KanbanItem {
  return {
    id: item.public_id,
    name: item.menu_item_name,
    quantity: item.quantity,
    modifiers: item.comment ?? undefined,
    status: item.status === "ready" ? "ready" : "pending",
  }
}

function mapTicket(ticket: KitchenTicket, items: OrderItem[]): KanbanTicket {
  const ticketItems = items.filter((it) => it.ticket === ticket.public_id)
  return {
    id: ticket.public_id,
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

function mapTicketShort(ticket: KitchenTicket): KanbanTicket {
  return {
    id: ticket.public_id,
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

function useCurrentTime(): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  )
  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      )
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export function KitchenKanban() {
  const currentTime = useCurrentTime()
  const [tick, setTick] = useState(0)
  const [tickets, setTickets] = useState<KanbanTicket[]>([])
  const [completed, setCompleted] = useState<KanbanTicket[]>([])
  const [avgPrepTimeSeconds, setAvgPrepTimeSeconds] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    return onKitchenEvent(() => setTick((t) => t + 1))
  }, [])

  useEffect(() => {
    if (!mutationError) return
    const id = setTimeout(() => setMutationError(null), 5000)
    return () => clearTimeout(id)
  }, [mutationError])

  useEffect(() => {
    const abort = new AbortController()

    async function load() {
      try {
        const [incoming, active, completedList, stats] = await Promise.all([
          fetchTickets("incoming", abort.signal),
          fetchTickets("active", abort.signal),
          fetchCompletedTickets(abort.signal),
          fetchTicketStats(abort.signal),
        ])

        const allActive = [...incoming, ...active]

        const itemsByOrder = await Promise.all(
          allActive.map((t) => fetchOrderItems(t.order, abort.signal)),
        )

        setTickets(allActive.map((t, i) => mapTicket(t, itemsByOrder[i])))
        setCompleted(completedList.map(mapTicketShort))
        setAvgPrepTimeSeconds(stats.avg_prep_time_seconds)
        setError(null)
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError("Could not load tickets.")
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => abort.abort()
  }, [tick])

  const toggleItem = useCallback(
    async (ticketId: string, itemId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId)
      const item = ticket?.items.find((it) => it.id === itemId)
      if (!item) return

      if (item.status === "ready") return

      const newStatus = "ready"
      try {
        const updated = await updateOrderItemStatus(itemId, newStatus)
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, items: t.items.map((it) => (it.id === itemId ? mapItem(updated) : it)) }
              : t,
          ),
        )
      } catch {
        setMutationError("Could not update item.")
      }
    },
    [tickets],
  )

  const bumpOrder = useCallback(
    async (ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId)
      if (!ticket) return
      if (!ticket.items.every((it) => it.status === "ready")) return

      try {
        await updateTicketStatus(ticketId, "completed")
        setCompleted((c) => [
          { ...ticket, status: "completed", completedMinutes: elapsedMinutes(ticket.startedAt) },
          ...c,
        ])
        setTickets((prev) => prev.filter((t) => t.id !== ticketId))
      } catch {
        setMutationError("Could not bump order.")
      }
    },
    [tickets],
  )

  const promoteToActive = useCallback(async (ticketId: string) => {
    try {
      await updateTicketStatus(ticketId, "active")
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: "active" } : t)))
    } catch {
      setMutationError("Could not accept order.")
    }
  }, [])

  void tick

  const incoming = useMemo(() => tickets.filter((t) => t.status === "incoming"), [tickets])
  const active = useMemo(() => tickets.filter((t) => t.status === "active"), [tickets])

  const batchCounts = useMemo<BatchCount[]>(() => {
    const counts = new Map<string, number>()
    for (const t of tickets) {
      if (t.status !== "active") continue
      for (const item of t.items) {
        const key = item.name.toLowerCase().replace(/s$/, "")
        counts.set(key, (counts.get(key) ?? 0) + item.quantity)
      }
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        label: `All ${key.charAt(0).toUpperCase()}${key.slice(1)}s`,
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [tickets])

  if (error) {
    return (
      <div className="kanban">
        <KanbanHeader currentTime={currentTime} />
        <div className="kanban__error">{error}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="kanban">
        <KanbanHeader currentTime={currentTime} />
        <div className="kanban__loading">Loading tickets...</div>
      </div>
    )
  }

  return (
    <div className="kanban">
      <KanbanHeader currentTime={currentTime} />

      {mutationError && <div className="kanban__toast">{mutationError}</div>}

      <div className="kanban__columns">
        <IncomingColumn tickets={incoming} onPromote={promoteToActive} />
        <ActiveColumn tickets={active} onToggleItem={toggleItem} onBump={bumpOrder} />
        <BatchColumn batches={batchCounts} />
        <CompletedColumn tickets={completed} />
      </div>

      <KanbanFooter
        incomingCount={incoming.length}
        activeCount={active.length}
        completedCount={completed.length}
        avgPrepTimeSeconds={avgPrepTimeSeconds}
      />
    </div>
  )
}
