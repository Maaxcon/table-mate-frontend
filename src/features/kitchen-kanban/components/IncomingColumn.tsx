import type { KanbanTicket } from "../types"
import { elapsedMinutes, timerUrgencyClass } from "../utils"

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
              className={`kanban-card kanban-card--clickable ${elapsed > 7 ? "kanban-card--aged" : ""}`}
              onClick={() => {
                if (!canManage) return
                onPromote(ticket.id)
              }}
              title={canManage ? "Click to accept order" : "Read only"}
              disabled={!canManage}
              aria-disabled={!canManage}
            >
              <div className="kanban-card__header">
                <span className="kanban-card__id">{ticket.id.slice(0, 8)}</span>
                <span className={`kanban-card__timer ${timerUrgencyClass(elapsed)}`}>
                  {elapsed}m
                </span>
              </div>
              <div className="kanban-card__items">
                {ticket.items.map((item) => (
                  <div key={item.id} className="kanban-card__item">
                    {item.quantity}X {item.name}
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
