import type { KanbanTicket } from "../types"

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
      <div className="kanban__col-body">
        {tickets.map((ticket) => (
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
  )
}
