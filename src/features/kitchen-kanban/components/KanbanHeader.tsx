import { Link } from "react-router-dom"

interface KanbanHeaderProps {
  currentTime: string
  isConnected?: boolean
}

export function KanbanHeader({ currentTime, isConnected = false }: KanbanHeaderProps) {
  return (
    <header className="kanban__header">
      <div className="kanban__header-left">
        <span className="kanban__brand">KITCHEN KANBAN SYSTEM</span>
        <span className="kanban__header-divider" />
        <span className="kanban__station-label">STATION:</span>
        <span className="kanban__station-badge">HOT LINE</span>
      </div>
      <div className="kanban__header-right">
        <span
          className={`kanban__connection ${isConnected ? "kanban__connection--connected" : ""}`}
          role="status"
          aria-label={isConnected ? "Connected" : "Disconnected"}
        />
        <span className="kanban__clock">{currentTime}</span>
        <Link to="/waiter-order" className="kanban__floor-link">
          FLOOR
        </Link>
      </div>
    </header>
  )
}
