import "./KanbanHeader.css"
import { Link } from "react-router-dom"
import { LuFlame } from "react-icons/lu"
import { useAdminStrings } from "@/features/admin/strings"

interface KanbanHeaderProps {
  currentTime: string
  isConnected?: boolean
}

export function KanbanHeader({ currentTime, isConnected = false }: KanbanHeaderProps) {
  const strings = useAdminStrings()
  return (
    <header className="kanban__header">
      <div className="kanban__header-left">
        <span className="kanban__logo" aria-hidden="true">
          <LuFlame />
        </span>
        <span className="kanban__brand">{strings.kitchen.header.brand}</span>
        <span className="kanban__header-divider" />
        <span className="kanban__station-label">{strings.kitchen.header.stationLabel}</span>
        <span className="kanban__station-badge">{strings.kitchen.header.stationValue}</span>
      </div>
      <div className="kanban__header-right">
        <span
          className={`kanban__connection ${isConnected ? "kanban__connection--connected" : ""}`}
          role="status"
          aria-label={isConnected ? strings.common.connected : strings.common.disconnected}
        />
        <div className="kanban__clock-wrap">
          <span className="kanban__clock">{currentTime}</span>
          <span className="kanban__clock-label">{strings.kitchen.header.localTime}</span>
        </div>
        <Link to="/waiter-order" className="kanban__floor-link">
          {strings.kitchen.header.floorLink}
        </Link>
      </div>
    </header>
  )
}
