import type { FloorTable, UpcomingReservation } from "../data/waiterTypes"
import { getTableVisualStatus, formatDuration, formatETA } from "../data/waiterTypes"
import "./FloorPlan.css"

interface FloorPlanProps {
  tables: FloorTable[]
  selectedId: string | null
  upcomingReservations?: UpcomingReservation[]
  currentTime: Date
  onSelect: (table: FloorTable) => void
}

export function FloorPlan({
  tables,
  selectedId,
  upcomingReservations = [],
  currentTime,
  onSelect,
}: FloorPlanProps) {
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

              {visualStatus === "reserved" && table.activeReservation && (
                <div className="floor-plan__table-info">
                  <span className="floor-plan__table-name">
                    {table.activeReservation.guest_name}
                  </span>
                  <span className="floor-plan__table-since">
                    in {formatETA(table.activeReservation.start_at)}
                  </span>
                </div>
              )}

              {visualStatus === "occupied" && table.activeSession && (
                <div className="floor-plan__table-info">
                  <span className="floor-plan__table-since">
                    {formatDuration(table.activeSession.opened_at)}
                  </span>
                </div>
              )}

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
