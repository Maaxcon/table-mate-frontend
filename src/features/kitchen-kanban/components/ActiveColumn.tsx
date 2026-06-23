import type { KanbanTicket } from "../types"
import { elapsedMinutes, timerUrgencyClass } from "../utils"

interface ActiveColumnProps {
  tickets: KanbanTicket[]
  onToggleItem(ticketId: string, itemId: string): void
  onBump(ticketId: string): void
}

export function ActiveColumn({ tickets, onToggleItem, onBump }: ActiveColumnProps) {
  return (
    <div className="kanban__col kanban__col--active">
      <div className="kanban__col-header">
        <span className="kanban__col-title">ACTIVE ORDERS</span>
        <span className="kanban__col-subtitle">PRIORITY QUEUE</span>
      </div>
      <div className="kanban__col-body">
        {tickets.length === 0 && (
          <div className="kanban-card kanban-card--empty">No active orders</div>
        )}
        {tickets.map((ticket) => {
          const allReady = ticket.items.every((it) => it.status === "ready")
          const elapsed = elapsedMinutes(ticket.startedAt)
          return (
            <div key={ticket.id} className="kanban-card kanban-card--active">
              <div className="kanban-card__top">
                <div className="kanban-card__header">
                  <span className="kanban-card__id">{ticket.id.slice(0, 8)}</span>
                  <span className="kanban-card__divider" />
                  <span className={`kanban-card__timer ${timerUrgencyClass(elapsed)}`}>
                    {elapsed}m
                  </span>
                </div>
                <button
                  type="button"
                  className={`kanban-card__bump ${allReady ? "kanban-card__bump--done" : ""}`}
                  onClick={() => onBump(ticket.id)}
                  disabled={!allReady}
                  aria-label="Complete order"
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
                      aria-hidden="true"
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
                    onClick={() => onToggleItem(ticket.id, item.id)}
                    aria-pressed={item.status === "ready"}
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
                        aria-hidden="true"
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
  )
}
