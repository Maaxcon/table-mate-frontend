import type { CSSProperties } from "react"
import { LuCircleCheck } from "react-icons/lu"
import "./ActiveColumn.css"
import type { KanbanTicket } from "../../types"
import { elapsedMinutes, timerUrgencyClass } from "../../utils"

interface ActiveColumnProps {
  tickets: KanbanTicket[]
  onToggleItem(ticketId: string, itemId: string): void
  onBump(ticketId: string): void
  canManage: boolean
}

export function ActiveColumn({ tickets, onToggleItem, onBump, canManage }: ActiveColumnProps) {
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
                  <span className="kanban-card__id">{ticket.label}</span>
                  <span className={`kanban-card__timer ${timerUrgencyClass(elapsed)}`}>
                    {elapsed}m
                  </span>
                </div>
                <button
                  type="button"
                  className={`kanban-card__bump ${allReady ? "kanban-card__bump--done" : ""}`}
                  onClick={() => {
                    if (!canManage) return
                    onBump(ticket.id)
                  }}
                  disabled={!allReady || !canManage}
                  aria-label="Complete order"
                >
                  {allReady ? (
                    <svg
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
                    className={`kanban-card__item-block kanban-card__item-block--cat ${item.status === "ready" ? "kanban-card__item-block--ready" : ""}`}
                    style={{ "--item-cat-color": item.categoryColor } as CSSProperties}
                    onClick={() => {
                      if (!canManage) return
                      onToggleItem(ticket.id, item.id)
                    }}
                    disabled={!canManage}
                    aria-pressed={item.status === "ready"}
                    aria-disabled={!canManage}
                  >
                    <span className="kanban-card__item-name">
                      {item.quantity}X {item.name}
                      {item.modifiers ? (
                        <span className="kanban-card__modifier"> ({item.modifiers})</span>
                      ) : null}
                      {item.categoryName && (
                        <span className="kanban-card__item-cat-tag">{item.categoryName}</span>
                      )}
                    </span>
                    {item.status === "ready" && (
                      <LuCircleCheck className="kanban-card__item-check" aria-hidden="true" />
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
