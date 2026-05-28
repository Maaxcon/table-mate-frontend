import type { FloorTable } from "../data/mockData"
import "./FloorPlan.css"

interface FloorPlanProps {
  tables: FloorTable[]
  selectedId: string | null
  onSelect: (table: FloorTable) => void
}

export function FloorPlan({ tables, selectedId, onSelect }: FloorPlanProps) {
  return (
    <div className="floor-plan">
      <h2 className="floor-plan__title">FLOOR PLAN</h2>
      <div className="floor-plan__canvas">
        {tables.map((table) => {
          const isOccupied = table.status === "occupied"
          const isFree = table.status === "free"

          return (
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
              <span className="floor-plan__table-badge">{isOccupied ? "OCCUPIED" : "FREE"}</span>

              <span className="floor-plan__table-number">{table.table_number}</span>

              {isOccupied && table.guest_count && (
                <span className="floor-plan__table-guests">
                  {Array.from({ length: table.guest_count }, (_, i) => (
                    <span key={i} className="floor-plan__guest-dot" />
                  ))}
                </span>
              )}

              <div className="floor-plan__table-meta">
                {isFree && <span className="floor-plan__table-available">AVAILABLE</span>}
                {isOccupied && (
                  <>
                    <span className="floor-plan__table-name">
                      {table.guest_name} &bull; {table.guest_count}P
                    </span>
                    <span className="floor-plan__table-since">SINCE {table.since}</span>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
