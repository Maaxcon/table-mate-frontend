import { useEffect, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { FloorTable, UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import { getTableVisualStatus } from "@/features/waiter-order-view/data/waiterTypes"
import type { Zone } from "@/features/reservation/api"
import "./CustomerFloorPlan.css"

interface CustomerFloorPlanProps {
  tables: Table[]
  zones: Zone[]
  selectedZone: string | null
  onZoneChange: (zoneId: string | null) => void
  selectedId: string | null
  onSelect: (table: Table) => void
  upcomingReservations?: UpcomingReservation[]
}

export function CustomerFloorPlan({
  tables,
  zones,
  selectedZone,
  onZoneChange,
  selectedId,
  onSelect,
  upcomingReservations = [],
}: CustomerFloorPlanProps) {
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

  const floorTables: FloorTable[] = tables.map((t) => ({
    public_id: t.public_id,
    table_number: t.table_number,
    capacity: t.capacity,
    shape: t.shape ?? "rectangle",
    status: t.status ?? "free",
    position_x: t.position_x ?? null,
    position_y: t.position_y ?? null,
    active: t.active ?? true,
    zone: t.zone ?? null,
  }))

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
          const ft = floorTables.find((ft) => ft.public_id === table.public_id)!
          const visualStatus = getTableVisualStatus(ft, upcomingReservations, currentTime)
          return (
            <button
              key={table.public_id}
              type="button"
              className={[
                "c-floor-plan__table",
                `c-floor-plan__table--${visualStatus}`,
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
              <span
                className={`c-floor-plan__table-badge c-floor-plan__table-badge--${visualStatus}`}
              >
                {statusLabel[visualStatus] ?? visualStatus.toUpperCase()}
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
