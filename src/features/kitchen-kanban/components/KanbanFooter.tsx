import { LuMoon, LuSun, LuTimer } from "react-icons/lu"
import { useTheme } from "@/hooks/useTheme"

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
  const { theme, toggleTheme } = useTheme()

  return (
    <footer className="kanban__footer">
      <div className="kanban__metrics">
        <span className="kanban__metric kanban__metric--incoming">INCOMING: {incomingCount}</span>
        <span className="kanban__metric kanban__metric--active">ACTIVE: {activeCount}</span>
        <span className="kanban__metric kanban__metric--completed">
          COMPLETED: {completedCount}
        </span>
        <span className="kanban__metric kanban__metric--prep">
          <LuTimer className="kanban__metric-icon" aria-hidden="true" />
          PREP TIME: {formatPrepTime(avgPrepTimeSeconds)}
        </span>
      </div>
      <button
        type="button"
        className="kanban__theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {theme === "light" ? <LuMoon /> : <LuSun />}
      </button>
    </footer>
  )
}
