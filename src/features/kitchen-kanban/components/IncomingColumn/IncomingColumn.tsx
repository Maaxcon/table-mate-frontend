import "./IncomingColumn.css"
import type { CSSProperties } from "react"
import type { KanbanTicket } from "../../types"
import { elapsedMinutes, timerUrgencyClass } from "../../utils"

interface IncomingColumnProps {
  tickets: KanbanTicket[]
  onPromote(ticketId: string): void
  canManage: boolean
}

export function IncomingColumn({ tickets, onPromote, canManage }: IncomingColumnProps) {
  return (
    <div className="kanban__col kanban__col--incoming">
      <div className="kanban__col-header">
        <span className="kanban__col-title">INCOMING</span>
        <span className="kanban__col-badge">{tickets.length}</span>
      </div>
      <div className="kanban__col-body">
        {tickets.length === 0 && (
          <div className="kanban-card kanban-card--empty">No incoming orders</div>
        )}
        {tickets.map((ticket) => {
          const elapsed = elapsedMinutes(ticket.startedAt)
          return (
            <button
              key={ticket.id}
              type="button"
              className="kanban-card kanban-card--incoming kanban-card--clickable"
              onClick={() => {
                if (!canManage) return
                onPromote(ticket.id)
              }}
              title={canManage ? "Click to accept order" : "Read only"}
              disabled={!canManage}
              aria-disabled={!canManage}
            >
              <div className="kanban-card__header">
                <span className="kanban-card__id">{ticket.label}</span>
                <span className={`kanban-card__timer ${timerUrgencyClass(elapsed)}`}>
                  {elapsed}m
                </span>
              </div>
              <div className="kanban-card__items">
                {ticket.items.map((item) => (
                  <div
                    key={item.id}
                    className="kanban-card__item kanban-card__item--cat"
                    style={{ "--item-cat-color": item.categoryColor } as CSSProperties}
                  >
                    <span className="kanban-card__item-qty">{item.quantity}X</span> {item.name}
                    {item.categoryName && (
                      <span className="kanban-card__item-cat-tag">{item.categoryName}</span>
                    )}
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
