import { useEffect, useState } from "react"
import type { FloorTable, UpcomingReservation } from "../data/waiterTypes"
import { getTableVisualStatus } from "../data/waiterTypes"
import "./FloorPlan.css"

interface FloorPlanProps {
  tables: FloorTable[]
  selectedId: string | null
  upcomingReservations?: UpcomingReservation[]
  onSelect: (table: FloorTable) => void
}

export function FloorPlan({
  tables,
  selectedId,
  upcomingReservations = [],
  onSelect,
}: FloorPlanProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const statusLabel: Record<string, string> = {
    free: "FREE",
    reserved: "RESERVED",
    occupied: "OCCUPIED",
  }

  return (
    <div className="floor-plan">
      <h2 className="floor-plan__title">FLOOR PLAN</h2>
      <div className="floor-plan__canvas">
        {tables.map((table) => {
          const visualStatus = getTableVisualStatus(table, upcomingReservations, currentTime)
          return (
            <button
              key={table.public_id}
              type="button"
              className={[
                "floor-plan__table",
                `floor-plan__table--${visualStatus}`,
                `floor-plan__table--${table.shape}`,
                selectedId === table.public_id ? "floor-plan__table--selected" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: table.position_x ?? undefined,
                top: table.position_y ?? undefined,
              }}
              onClick={() => onSelect(table)}
            >
              <span className={`floor-plan__table-badge floor-plan__table-badge--${visualStatus}`}>
                {statusLabel[visualStatus] ?? visualStatus.toUpperCase()}
              </span>

              <span className="floor-plan__table-number">{table.table_number}</span>

              <div className="floor-plan__table-meta">
                <span className="floor-plan__table-capacity">{table.capacity} P</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
