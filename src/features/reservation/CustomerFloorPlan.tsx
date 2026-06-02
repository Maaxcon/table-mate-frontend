import type { Table } from "@/types/api/types.gen"
import "./CustomerFloorPlan.css"

interface CustomerFloorPlanProps {
  tables: Table[]
  selectedId: string | null
  onSelect: (table: Table) => void
}

export function CustomerFloorPlan({ tables, selectedId, onSelect }: CustomerFloorPlanProps) {
  return (
    <div className="c-floor-plan">
      <h2 className="c-floor-plan__title">FLOOR PLAN</h2>
      <p className="c-floor-plan__hint">Tap a free table to book</p>
      <div className="c-floor-plan__canvas">
        {tables.map((table) => {
          const isFree = table.status === "free"
          const isOccupied = table.status === "occupied"

          return (
            <button
              key={table.public_id}
              type="button"
              className={[
                "c-floor-plan__table",
                `c-floor-plan__table--${table.status}`,
                `c-floor-plan__table--${table.shape}`,
                selectedId === table.public_id ? "c-floor-plan__table--selected" : "",
                isOccupied ? "c-floor-plan__table--disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: table.position_x ?? undefined,
                top: table.position_y ?? undefined,
              }}
              onClick={() => isFree && onSelect(table)}
              disabled={!isFree}
            >
              <span className="c-floor-plan__table-badge">{isOccupied ? "OCCUPIED" : "FREE"}</span>

              <span className="c-floor-plan__table-number">{table.table_number}</span>

              <div className="c-floor-plan__table-meta">
                <span className="c-floor-plan__table-capacity">{table.capacity} P</span>
                {isFree && <span className="c-floor-plan__table-available">AVAILABLE</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
