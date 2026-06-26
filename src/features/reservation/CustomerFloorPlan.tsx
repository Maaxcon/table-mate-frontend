import { useEffect, useMemo, useRef, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { FloorTable, UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import { getTableVisualStatus } from "@/features/waiter-order-view/data/waiterTypes"
import type { Zone } from "@/features/reservation/api"
import { bookStrings } from "@/features/reservation/strings"
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

// Footprint reserved per table (largest table box plus a little breathing room),
// used to size the canvas so scaling never clips a table at the edges.
const TABLE_FOOTPRINT = 160

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

  // Tables come positioned in raw backend pixels, so we measure the viewport and
  // scale the whole canvas down to fit — keeping the spatial layout on any screen.
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setViewportWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { contentWidth, contentHeight } = useMemo(() => {
    let maxX = 0
    let maxY = 0
    for (const t of tables) {
      maxX = Math.max(maxX, (t.position_x ?? 0) + TABLE_FOOTPRINT)
      maxY = Math.max(maxY, (t.position_y ?? 0) + TABLE_FOOTPRINT)
    }
    return { contentWidth: Math.max(maxX, 320), contentHeight: Math.max(maxY, 320) }
  }, [tables])

  const scale = viewportWidth > 0 ? Math.min(1, viewportWidth / contentWidth) : 1

  const statusLabel: Record<string, string> = { ...bookStrings.floorPlan.status }

  const floorTables: FloorTable[] = tables.map((t) => ({
    public_id: t.public_id,
    table_number: t.table_number,
    capacity: t.capacity,
    shape: t.shape ?? "rectangle",
    is_occupied: t.is_occupied ?? false,
    position_x: t.position_x ?? null,
    position_y: t.position_y ?? null,
    active: t.active ?? true,
    zone: t.zone ?? null,
  }))

  return (
    <div className="c-floor-plan">
      <h2 className="c-floor-plan__title">{bookStrings.floorPlan.title}</h2>
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
      <div
        className="c-floor-plan__viewport"
        ref={viewportRef}
        style={{ height: contentHeight * scale }}
      >
        <div
          className="c-floor-plan__canvas"
          style={{
            width: contentWidth,
            height: contentHeight,
            transform: `scale(${scale})`,
          }}
        >
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
                  <span className="c-floor-plan__table-capacity">
                    {bookStrings.floorPlan.seats(table.capacity)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
