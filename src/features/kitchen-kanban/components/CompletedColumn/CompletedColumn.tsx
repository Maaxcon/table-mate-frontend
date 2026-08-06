import "./CompletedColumn.css"
import { LuCalendarClock, LuCheck } from "react-icons/lu"
import type { KanbanTicket } from "../../types"
import { useAdminStrings } from "@/features/admin/strings"

interface CompletedColumnProps {
  tickets: KanbanTicket[]
}

export function CompletedColumn({ tickets }: CompletedColumnProps) {
  const strings = useAdminStrings()
  return (
    <div className="kanban__col kanban__col--completed">
      <div className="kanban__col-header">
        <span className="kanban__col-title">{strings.kitchen.completed.title}</span>
        <span className="kanban__col-badge">{tickets.length}</span>
      </div>
      <div className="kanban__col-body kanban__col-body--grid">
        {tickets.length === 0 && (
          <div className="kanban-card kanban-card--empty">{strings.kitchen.completed.empty}</div>
        )}
        {tickets.map((ticket) => (
          <div key={ticket.id} className="kanban-card kanban-card--completed">
            <div className="kanban-card__completed-top">
              <span className="kanban-card__id">
                {ticket.label}
                {ticket.isPreorder && (
                  <LuCalendarClock
                    className="kanban-card__preorder-badge"
                    aria-label={strings.kitchen.preorderBadgeAria}
                  />
                )}
              </span>
              <LuCheck className="kanban-card__check" aria-label={strings.kitchen.completed.aria} />
            </div>
            <span className="kanban-card__timer">{ticket.completedMinutes}m</span>
          </div>
        ))}
      </div>
    </div>
  )
}
