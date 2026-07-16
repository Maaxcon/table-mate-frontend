import "./KanbanFooter.css"
import { LuTimer } from "react-icons/lu"
import { useAdminStrings } from "@/features/admin/strings"

interface KanbanFooterProps {
  incomingCount: number
  activeCount: number
  completedCount: number
  avgPrepTimeSeconds: number | null
}

function formatPrepTime(seconds: number | null): string {
  if (seconds === null) return "—"
  const minutes = Math.round(seconds / 60)
  return `${minutes}m`
}

export function KanbanFooter({
  incomingCount,
  activeCount,
  completedCount,
  avgPrepTimeSeconds,
}: KanbanFooterProps) {
  const strings = useAdminStrings()
  return (
    <footer className="kanban__footer">
      <div className="kanban__metrics">
        <span className="kanban__metric kanban__metric--incoming">
          {strings.kitchen.footer.incoming}: {incomingCount}
        </span>
        <span className="kanban__metric kanban__metric--active">
          {strings.kitchen.footer.active}: {activeCount}
        </span>
        <span className="kanban__metric kanban__metric--completed">
          {strings.kitchen.footer.completed}: {completedCount}
        </span>
        <span className="kanban__metric kanban__metric--prep">
          <LuTimer className="kanban__metric-icon" aria-hidden="true" />
          {strings.kitchen.footer.prepTime}: {formatPrepTime(avgPrepTimeSeconds)}
        </span>
      </div>
    </footer>
  )
}
