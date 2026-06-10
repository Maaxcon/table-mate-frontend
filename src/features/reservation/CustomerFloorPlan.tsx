import type { Table } from "@/types/api/types.gen"
import type { Zone } from "@/features/reservation/api"
import "./CustomerFloorPlan.css"

interface CustomerFloorPlanProps {
  tables: Table[]
  zones: Zone[]
  selectedZone: string | null
  onZoneChange: (zoneId: string | null) => void
  selectedId: string | null
  onSelect: (table: Table) => void
}

export function CustomerFloorPlan({
  tables,
  zones,
  selectedZone,
  onZoneChange,
  selectedId,
  onSelect,
}: CustomerFloorPlanProps) {
  const statusLabel: Record<string, string> = {
    free: "FREE",
    reserved: "RESERVED",
    occupied: "OCCUPIED",
  }

  return (
    <div className="c-floor-plan">
      <h2 className="c-floor-plan__title">FLOOR PLAN</h2>
      {zones.length > 1 && (
        <div className="c-floor-plan__zones">
          {zones.map((z) => (
            <button
              key={z.public_id}
              type="button"
              className={`c-floor-plan__zone ${selectedZone === z.public_id ? "c-floor-plan__zone--active" : ""}`}
              onClick={() => onZoneChange(z.public_id)}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}
      <div className="c-floor-plan__canvas">
        {tables.map((table) => {
          const status = table.status ?? "free"
          return (
            <button
              key={table.public_id}
              type="button"
              className={[
                "c-floor-plan__table",
                `c-floor-plan__table--${status}`,
                `c-floor-plan__table--${table.shape}`,
                selectedId === table.public_id ? "c-floor-plan__table--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: table.position_x ?? undefined,
                top: table.position_y ?? undefined,
              }}
              onClick={() => onSelect(table)}
            >
              <span className={`c-floor-plan__table-badge c-floor-plan__table-badge--${status}`}>
                {statusLabel[status] ?? status.toUpperCase()}
              </span>

              <span className="c-floor-plan__table-number">{table.table_number}</span>

              <div className="c-floor-plan__table-meta">
                <span className="c-floor-plan__table-capacity">{table.capacity} P</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
