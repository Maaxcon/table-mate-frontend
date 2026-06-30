import { useEffect, useMemo, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { LayoutPayload } from "@/features/editor/types"
import { FloorPlanView, type FloorPlanTableRef } from "@/features/floorplan/FloorPlanView"
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
  payload?: LayoutPayload | null
}

const statusLabel: Record<string, string> = {
  free: "FREE",
  reserved: "RESERVED",
  occupied: "OCCUPIED",
}

export function CustomerFloorPlan({
  tables,
  zones,
  selectedZone,
  onZoneChange,
  selectedId,
  onSelect,
  upcomingReservations = [],
  payload = null,
}: CustomerFloorPlanProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Join a layout table to its live table by public_id, falling back to public_number.
  const { byId, byNumber } = useMemo(() => {
    const byId = new Map(tables.map((t) => [t.public_id, t]))
    const byNumber = new Map(tables.map((t) => [t.public_number, t]))
    return { byId, byNumber }
  }, [tables])

  const resolve = (ref: FloorPlanTableRef): Table | undefined =>
    byId.get(ref.id) ?? (ref.publicNumber ? byNumber.get(ref.publicNumber) : undefined)

  const statusFor = (t: Table | undefined) => {
    if (!t) return "free" as const
    const floorTable = {
      public_id: t.public_id,
      public_number: t.public_number,
      capacity: t.capacity,
      shape: "square",
      is_occupied: t.is_occupied ?? false,
      active: t.active ?? true,
    } as FloorTable
    return getTableVisualStatus(floorTable, upcomingReservations, currentTime)
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
      <FloorPlanView
        payload={payload}
        selectedZoneId={selectedZone}
        selectedId={selectedId}
        edgeStyles={zones.find((z) => z.public_id === selectedZone)?.edge_styles ?? undefined}
        canvasCols={zones.find((z) => z.public_id === selectedZone)?.canvas_cols}
        canvasRows={zones.find((z) => z.public_id === selectedZone)?.canvas_rows}
        onTableSelect={(ref) => {
          const table = resolve(ref)
          if (table) onSelect(table)
        }}
        onPortalNavigate={(targetZoneId) => onZoneChange(targetZoneId)}
        tableStatus={(ref) => statusFor(resolve(ref))}
        renderTableContent={(ref) => {
          const table = resolve(ref)
          const visualStatus = statusFor(table)
          const number = table?.public_number ?? ref.publicNumber
          const capacity = table?.capacity ?? ref.capacity
          return (
            <>
              <span className={`fp-block__badge fp-block__badge--${visualStatus}`}>
                {statusLabel[visualStatus] ?? visualStatus.toUpperCase()}
              </span>
              <span className="fp-block__label">{number}</span>
              {capacity != null && <span className="fp-block__capacity">{capacity}P</span>}
            </>
          )
        }}
      />
    </div>
  )
}
