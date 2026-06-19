import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import "./KitchenKanban.css"
import {
  fetchTickets,
  fetchCompletedTickets,
  fetchOrderItems,
  updateTicketStatus,
  updateOrderItemStatus,
  type KitchenTicket,
} from "./api"
import type { OrderItem } from "@/types/api/types.gen"

interface KanbanItem {
  id: string
  name: string
  quantity: number
  modifiers?: string
  status: "pending" | "ready"
}

interface KanbanTicket {
  id: string
  status: "incoming" | "active" | "completed"
  items: KanbanItem[]
  startedAt: number
  guestCount: number
  serverName: string
  completedMinutes?: number
}

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

function elapsedMinutes(startedAt: number): number {
  return Math.floor((Date.now() - startedAt) / 60000)
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const abort = new AbortController()

    async function load() {
      try {
        const [incoming, active, completedList] = await Promise.all([
          fetchTickets("incoming", abort.signal),
          fetchTickets("active", abort.signal),
          fetchCompletedTickets(abort.signal),
        ])

        const allActive = [...incoming, ...active]

        const itemsByOrder = await Promise.all(
          allActive.map((t) => fetchOrderItems(t.order, abort.signal)),
        )

        setTickets(allActive.map((t, i) => mapTicket(t, itemsByOrder[i])))
        setCompleted(completedList.map(mapTicketShort))
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

      const newStatus = item.status === "ready" ? "pending" : "ready"
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
        setError("Could not update item.")
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
        setError("Could not bump order.")
      }
    },
    [tickets],
  )

  const promoteToActive = useCallback(async (ticketId: string) => {
    try {
      await updateTicketStatus(ticketId, "active")
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: "active" } : t)))
    } catch {
      setError("Could not accept order.")
    }
  }, [])

  void tick

  const incoming = useMemo(() => tickets.filter((t) => t.status === "incoming"), [tickets])
  const active = useMemo(() => tickets.filter((t) => t.status === "active"), [tickets])

  const batchCounts = useMemo(() => {
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
        <header className="kanban__header">
          <div className="kanban__header-left">
            <span className="kanban__brand">KITCHEN KANBAN SYSTEM</span>
          </div>
        </header>
        <div className="kanban__error">{error}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="kanban">
        <header className="kanban__header">
          <div className="kanban__header-left">
            <span className="kanban__brand">KITCHEN KANBAN SYSTEM</span>
          </div>
        </header>
        <div className="kanban__loading">Loading tickets...</div>
      </div>
    )
  }

  return (
    <div className="kanban">
      <header className="kanban__header">
        <div className="kanban__header-left">
          <span className="kanban__brand">KITCHEN KANBAN SYSTEM</span>
          <span className="kanban__header-divider" />
          <span className="kanban__station-label">STATION:</span>
          <span className="kanban__station-badge">HOT LINE</span>
        </div>
        <div className="kanban__header-right">
          <span className="kanban__clock">{currentTime}</span>
          <Link to="/waiter-order" className="kanban__floor-link">
            FLOOR
          </Link>
        </div>
      </header>

      <div className="kanban__columns">
        <div className="kanban__col kanban__col--incoming">
          <div className="kanban__col-header">
            <span className="kanban__col-title">INCOMING</span>
            <span className="kanban__col-badge">{incoming.length}</span>
          </div>
          <div className="kanban__col-body">
            {incoming.length === 0 && (
              <div className="kanban-card kanban-card--empty">No incoming orders</div>
            )}
            {incoming.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className={`kanban-card kanban-card--clickable ${elapsedMinutes(ticket.startedAt) > 7 ? "kanban-card--aged" : ""}`}
                onClick={() => promoteToActive(ticket.id)}
                title="Click to accept order"
              >
                <div className="kanban-card__header">
                  <span className="kanban-card__id">{ticket.id.slice(0, 8)}</span>
                  <span className="kanban-card__timer">{elapsedMinutes(ticket.startedAt)}m</span>
                </div>
                <div className="kanban-card__items">
                  {ticket.items.map((item) => (
                    <div key={item.id} className="kanban-card__item">
                      {item.quantity}X {item.name}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="kanban__col kanban__col--active">
          <div className="kanban__col-header">
            <span className="kanban__col-title">ACTIVE ORDERS</span>
            <span className="kanban__col-subtitle">PRIORITY QUEUE</span>
          </div>
          <div className="kanban__col-body">
            {active.length === 0 && (
              <div className="kanban-card kanban-card--empty">No active orders</div>
            )}
            {active.map((ticket) => {
              const allReady = ticket.items.every((it) => it.status === "ready")
              return (
                <div key={ticket.id} className="kanban-card kanban-card--active">
                  <div className="kanban-card__top">
                    <div className="kanban-card__header">
                      <span className="kanban-card__id">{ticket.id.slice(0, 8)}</span>
                      <span className="kanban-card__divider" />
                      <span className="kanban-card__timer">
                        {elapsedMinutes(ticket.startedAt)}m
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`kanban-card__bump ${allReady ? "kanban-card__bump--done" : ""}`}
                      onClick={() => bumpOrder(ticket.id)}
                      disabled={!allReady}
                    >
                      {allReady ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        "BUMP"
                      )}
                    </button>
                  </div>
                  <div className="kanban-card__items">
                    {ticket.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`kanban-card__item-block ${item.status === "ready" ? "kanban-card__item-block--ready" : ""}`}
                        onClick={() => toggleItem(ticket.id, item.id)}
                      >
                        <span>
                          {item.quantity}X {item.name}
                          {item.modifiers ? (
                            <span className="kanban-card__modifier"> ({item.modifiers})</span>
                          ) : null}
                        </span>
                        {item.status === "ready" && (
                          <svg
                            className="kanban-card__check"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="kanban-card__footer">
                    <span>G: {ticket.guestCount}</span>
                    <span>SERVER: {ticket.serverName.toUpperCase()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="kanban__col kanban__col--batch">
          <div className="kanban__col-header">
            <span className="kanban__col-title">BATCH VIEW</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="kanban__col-body">
            {batchCounts.map((batch) => (
              <div key={batch.label} className="kanban-card kanban-card--batch">
                <span className="kanban-card__batch-label">{batch.label}</span>
                <span className="kanban-card__batch-count">{batch.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="kanban__col kanban__col--completed">
          <div className="kanban__col-header">
            <span className="kanban__col-title">COMPLETED</span>
            <span className="kanban__col-badge">{completed.length}</span>
          </div>
          <div className="kanban__col-body">
            {completed.map((ticket) => (
              <div key={ticket.id} className="kanban-card kanban-card--completed">
                <span className="kanban-card__id">{ticket.id.slice(0, 8)}</span>
                <svg
                  className="kanban-card__check"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="kanban-card__timer">{ticket.completedMinutes}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="kanban__footer">
        <span>INCOMING: {incoming.length}</span>
        <span>ACTIVE: {active.length}</span>
        <span>COMPLETED (TODAY): {completed.length}</span>
        <span>AVG PREP TIME: 28m</span>
      </footer>
    </div>
  )
}
