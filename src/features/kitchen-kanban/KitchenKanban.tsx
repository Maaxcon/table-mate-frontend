import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import "./KitchenKanban.css"

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

const INITIAL_TICKETS: KanbanTicket[] = [
  {
    id: "T12",
    status: "incoming",
    startedAt: Date.now() - 4 * 60000,
    guestCount: 2,
    serverName: "Anya",
    items: [
      { id: "i1", name: "Burger", quantity: 1, status: "pending" },
      { id: "i2", name: "Wings", quantity: 1, status: "pending" },
    ],
  },
  {
    id: "T8",
    status: "incoming",
    startedAt: Date.now() - 2 * 60000,
    guestCount: 3,
    serverName: "Milo",
    items: [{ id: "i3", name: "Pizza", quantity: 2, modifiers: "Pepperoni", status: "pending" }],
  },
  {
    id: "T3",
    status: "incoming",
    startedAt: Date.now() - 9 * 60000,
    guestCount: 1,
    serverName: "Jade",
    items: [
      { id: "i4", name: "Caesar Salad", quantity: 1, status: "pending" },
      { id: "i5", name: "Fries", quantity: 1, status: "pending" },
    ],
  },
  {
    id: "T5",
    status: "active",
    startedAt: Date.now() - 12 * 60000,
    guestCount: 4,
    serverName: "Anya",
    items: [
      { id: "i6", name: "Steak", quantity: 2, modifiers: "Med-rare", status: "pending" },
      { id: "i7", name: "Fries", quantity: 1, status: "ready" },
      { id: "i8", name: "Grilled Chicken", quantity: 1, status: "pending" },
      { id: "i9", name: "Side Salad", quantity: 2, status: "pending" },
    ],
  },
  {
    id: "T9",
    status: "active",
    startedAt: Date.now() - 8 * 60000,
    guestCount: 2,
    serverName: "Milo",
    items: [
      { id: "i10", name: "Burger", quantity: 2, status: "pending" },
      { id: "i11", name: "Fries", quantity: 2, status: "ready" },
    ],
  },
  {
    id: "T2",
    status: "active",
    startedAt: Date.now() - 18 * 60000,
    guestCount: 3,
    serverName: "Jade",
    items: [
      { id: "i12", name: "Ribeye Steak", quantity: 1, modifiers: "Well-done", status: "ready" },
      { id: "i13", name: "Mushroom Risotto", quantity: 1, status: "pending" },
      { id: "i14", name: "Grilled Salmon", quantity: 1, status: "ready" },
    ],
  },
]

const INITIAL_COMPLETED: KanbanTicket[] = [
  {
    id: "T1",
    status: "completed",
    startedAt: 0,
    guestCount: 2,
    serverName: "Anya",
    items: [],
    completedMinutes: 45,
  },
  {
    id: "T4",
    status: "completed",
    startedAt: 0,
    guestCount: 4,
    serverName: "Milo",
    items: [],
    completedMinutes: 32,
  },
  {
    id: "T7",
    status: "completed",
    startedAt: 0,
    guestCount: 1,
    serverName: "Jade",
    items: [],
    completedMinutes: 28,
  },
]

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
  const [tickets, setTickets] = useState<KanbanTicket[]>(INITIAL_TICKETS)
  const [completed, setCompleted] = useState<KanbanTicket[]>(INITIAL_COMPLETED)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const toggleItem = useCallback((ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              items: t.items.map((it) =>
                it.id === itemId
                  ? { ...it, status: it.status === "ready" ? "pending" : "ready" }
                  : it,
              ),
            }
          : t,
      ),
    )
  }, [])

  const bumpOrder = useCallback((ticketId: string) => {
    setTickets((prev) => {
      const ticket = prev.find((t) => t.id === ticketId)
      if (!ticket) return prev
      const allReady = ticket.items.every((it) => it.status === "ready")
      if (!allReady) return prev
      setCompleted((c) => [
        { ...ticket, status: "completed", completedMinutes: elapsedMinutes(ticket.startedAt) },
        ...c,
      ])
      return prev.filter((t) => t.id !== ticketId)
    })
  }, [])

  const promoteToActive = useCallback((ticketId: string) => {
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: "active" } : t)))
  }, [])

  // force re-render every 30s so elapsedMinutes() recalculates
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
            {incoming.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className={`kanban-card kanban-card--clickable ${elapsedMinutes(ticket.startedAt) > 7 ? "kanban-card--aged" : ""}`}
                onClick={() => promoteToActive(ticket.id)}
                title="Click to accept order"
              >
                <div className="kanban-card__header">
                  <span className="kanban-card__id">{ticket.id}</span>
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
            {active.map((ticket) => {
              const allReady = ticket.items.every((it) => it.status === "ready")
              return (
                <div key={ticket.id} className="kanban-card kanban-card--active">
                  <div className="kanban-card__top">
                    <div className="kanban-card__header">
                      <span className="kanban-card__id">{ticket.id}</span>
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
                <span className="kanban-card__id">{ticket.id}</span>
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
