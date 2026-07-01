import "./CompletedColumn.css"
import { LuCheck } from "react-icons/lu"
import type { KanbanTicket } from "../../types"

interface CompletedColumnProps {
  tickets: KanbanTicket[]
}

export function CompletedColumn({ tickets }: CompletedColumnProps) {
  return (
    <div className="kanban__col kanban__col--completed">
      <div className="kanban__col-header">
        <span className="kanban__col-title">COMPLETED</span>
        <span className="kanban__col-badge">{tickets.length}</span>
      </div>
      <div className="kanban__col-body kanban__col-body--grid">
        {tickets.length === 0 && (
          <div className="kanban-card kanban-card--empty">No completed orders</div>
        )}
        {tickets.map((ticket) => (
          <div key={ticket.id} className="kanban-card kanban-card--completed">
            <div className="kanban-card__completed-top">
              <span className="kanban-card__id">{ticket.label}</span>
              <LuCheck className="kanban-card__check" aria-label="Completed" />
            </div>
            <span className="kanban-card__timer">{ticket.completedMinutes}m</span>
          </div>
        ))}
      </div>
    </div>
  )
}
