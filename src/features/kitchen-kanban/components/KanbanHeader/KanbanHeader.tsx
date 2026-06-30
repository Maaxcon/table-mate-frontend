import "./KanbanHeader.css"
import { Link } from "react-router-dom"
import { LuFlame } from "react-icons/lu"

interface KanbanHeaderProps {
  currentTime: string
  isConnected?: boolean
}

export function KanbanHeader({ currentTime, isConnected = false }: KanbanHeaderProps) {
  return (
    <header className="kanban__header">
      <div className="kanban__header-left">
        <span className="kanban__logo" aria-hidden="true">
          <LuFlame />
        </span>
        <span className="kanban__brand">KITCHEN KANBAN</span>
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
        <div className="kanban__clock-wrap">
          <span className="kanban__clock">{currentTime}</span>
          <span className="kanban__clock-label">LOCAL TIME</span>
        </div>
        <Link to="/waiter-order" className="kanban__floor-link">
          FLOOR
        </Link>
      </div>
    </header>
  )
}
