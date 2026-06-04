import type { FloorTable } from "../data/mockData"
import "./FloorPlan.css"

interface FloorPlanProps {
  tables: FloorTable[]
  selectedId: string | null
  onSelect: (table: FloorTable) => void
}

export function FloorPlan({ tables, selectedId, onSelect }: FloorPlanProps) {
  const statusLabel: Record<string, string> = {
    free: "FREE",
    reserved: "RESERVED",
    occupied: "OCCUPIED",
  }

  return (
    <div className="floor-plan">
      <h2 className="floor-plan__title">FLOOR PLAN</h2>
      <div className="floor-plan__canvas">
        {tables.map((table) => (
          <button
            key={table.public_id}
            type="button"
            className={[
              "floor-plan__table",
              `floor-plan__table--${table.status}`,
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
            <span className={`floor-plan__table-badge floor-plan__table-badge--${table.status}`}>
              {statusLabel[table.status] ?? table.status.toUpperCase()}
            </span>

            <span className="floor-plan__table-number">{table.table_number}</span>

            <div className="floor-plan__table-meta">
              <span className="floor-plan__table-capacity">{table.capacity} P</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
