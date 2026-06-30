import { useMemo } from "react"
import { FloorPlanView, type FloorPlanTableRef } from "@/features/floorplan/FloorPlanView"
import type { LayoutPayload } from "@/features/editor/types"
import type { FloorTable, UpcomingReservation } from "../data/waiterTypes"
import { getTableVisualStatus, formatDuration, formatETA } from "../data/waiterTypes"
import "./FloorPlan.css"

interface FloorPlanProps {
  payload: LayoutPayload | null | undefined
  tables: FloorTable[]
  selectedZoneId?: string | null
  selectedId: string | null
  upcomingReservations?: UpcomingReservation[]
  currentTime: Date
  onSelect: (table: FloorTable) => void
  onZoneChange?: (zoneId: string) => void
  canvasCols?: number
  canvasRows?: number
  edgeStyles?: Record<string, "dashed" | "solid">
  maxScale?: number
}

const statusLabel: Record<string, string> = {
  free: "FREE",
  reserved: "RESERVED",
  occupied: "OCCUPIED",
}

export function FloorPlan({
  payload,
  tables,
  selectedZoneId = null,
  selectedId,
  upcomingReservations = [],
  currentTime,
  onSelect,
  onZoneChange,
  canvasCols,
  canvasRows,
  edgeStyles,
  maxScale,
}: FloorPlanProps) {
  // Join a layout table to its live table by public_id, falling back to public_number.
  const { byId, byNumber } = useMemo(() => {
    const byId = new Map(tables.map((t) => [t.public_id, t]))
    const byNumber = new Map(tables.map((t) => [t.public_number, t]))
    return { byId, byNumber }
  }, [tables])

  // Nearest upcoming reservation per table (for showing guest name + ETA).
  const nearestByTable = useMemo(() => {
    const map = new Map<string, UpcomingReservation>()
    for (const r of upcomingReservations) {
      const existing = map.get(r.table_id)
      if (!existing || new Date(r.start_at) < new Date(existing.start_at)) {
        map.set(r.table_id, r)
      }
    }
    return map
  }, [upcomingReservations])

  const resolve = (ref: FloorPlanTableRef): FloorTable | undefined =>
    byId.get(ref.id) ?? (ref.publicNumber ? byNumber.get(ref.publicNumber) : undefined)

  return (
    <div className="floor-plan">
      <h2 className="floor-plan__title">FLOOR PLAN</h2>
      <FloorPlanView
        payload={payload}
        selectedZoneId={selectedZoneId}
        selectedId={selectedId}
        edgeStyles={edgeStyles}
        canvasCols={canvasCols}
        canvasRows={canvasRows}
        maxScale={maxScale}
        onTableSelect={(ref) => {
          const table = resolve(ref)
          if (table) onSelect(table)
        }}
        onPortalNavigate={onZoneChange ? (targetZoneId) => onZoneChange(targetZoneId) : undefined}
        tableStatus={(ref) => {
          const table = resolve(ref)
          return table ? getTableVisualStatus(table, upcomingReservations, currentTime) : "free"
        }}
        renderTableContent={(ref) => {
          const table = resolve(ref)
          const visualStatus = table
            ? getTableVisualStatus(table, upcomingReservations, currentTime)
            : "free"
          const number = table?.public_number ?? ref.publicNumber
          const capacity = table?.capacity ?? ref.capacity
          return (
            <>
              <span className={`fp-block__badge fp-block__badge--${visualStatus}`}>
                {statusLabel[visualStatus] ?? visualStatus.toUpperCase()}
              </span>
              <span className="fp-block__label">{number}</span>

              {visualStatus === "reserved" &&
                (() => {
                  const res = table ? nearestByTable.get(table.public_id) : undefined
                  return res ? (
                    <div className="fp-block__info">
                      <span className="fp-block__info-name">{res.customer_name ?? "Guest"}</span>
                      <span className="fp-block__info-sub">in {formatETA(res.start_at)}</span>
                    </div>
                  ) : null
                })()}

              {visualStatus === "occupied" && table?.activeSession && (
                <div className="fp-block__info">
                  {table.activeReservation && (
                    <span className="fp-block__info-name">
                      {table.activeReservation.guest_name}
                    </span>
                  )}
                  <span className="fp-block__info-sub">
                    {formatDuration(table.activeSession.opened_at)}
                  </span>
                </div>
              )}

              {capacity != null && <span className="fp-block__capacity">{capacity}P</span>}
            </>
          )
        }}
      />
    </div>
  )
}
