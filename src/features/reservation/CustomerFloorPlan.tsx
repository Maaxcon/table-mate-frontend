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

// Footprint reserved per table (table box + the seat ring around it), used to
// size the canvas so scaling never clips a table or its chairs.
const TABLE_FOOTPRINT = 184
// Breathing room kept between the tables and the canvas edges.
const CANVAS_PADDING = 32

// CSS transforms that arrange `capacity` chairs evenly around a table centre.
function seatTransforms(capacity: number, shape: string): string[] {
  const n = Math.max(0, Math.min(capacity, 14))
  const radius = shape === "round" ? 72 : 78
  return Array.from(
    { length: n },
    (_, i) =>
      `translate(-50%, -50%) rotate(${(360 / n) * i}deg) translateY(-${radius}px) rotate(${-(360 / n) * i}deg)`,
  )
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

  // Normalize raw backend positions so the layout always sits inset from the
  // edges (no tables jammed into the corner) regardless of their coordinates.
  const { offsetX, offsetY, contentWidth, contentHeight } = useMemo(() => {
    let minX = Infinity
    let minY = Infinity
    let maxRight = 0
    let maxBottom = 0
    for (const t of tables) {
      const x = t.position_x ?? 0
      const y = t.position_y ?? 0
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxRight = Math.max(maxRight, x + TABLE_FOOTPRINT)
      maxBottom = Math.max(maxBottom, y + TABLE_FOOTPRINT)
    }
    if (!Number.isFinite(minX)) {
      minX = 0
      minY = 0
    }
    return {
      offsetX: CANVAS_PADDING - minX,
      offsetY: CANVAS_PADDING - minY,
      contentWidth: Math.max(maxRight - minX + CANVAS_PADDING * 2, 320),
      contentHeight: Math.max(maxBottom - minY + CANVAS_PADDING * 2, 280),
    }
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
                  left: (table.position_x ?? 0) + offsetX,
                  top: (table.position_y ?? 0) + offsetY,
                }}
                onClick={() => onSelect(table)}
              >
                <span className="c-floor-plan__seats" aria-hidden="true">
                  {seatTransforms(table.capacity, table.shape ?? "rectangle").map((tr, i) => (
                    <span key={i} className="c-floor-plan__seat" style={{ transform: tr }} />
                  ))}
                </span>

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

      <div className="c-floor-plan__legend">
        <span className="c-floor-plan__legend-item c-floor-plan__legend-item--free">
          {bookStrings.floorPlan.status.free}
        </span>
        <span className="c-floor-plan__legend-item c-floor-plan__legend-item--reserved">
          {bookStrings.floorPlan.status.reserved}
        </span>
        <span className="c-floor-plan__legend-item c-floor-plan__legend-item--occupied">
          {bookStrings.floorPlan.status.occupied}
        </span>
      </div>
    </div>
  )
}
