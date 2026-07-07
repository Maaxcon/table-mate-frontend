import { useCallback, useEffect, useRef, useState } from "react"
import { LuMaximize, LuMinus, LuPlus, LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import type { EditorEntity, LayoutPayload } from "@/features/editor/types"
import { FloorPlanView } from "@/features/floorplan/FloorPlanView"
import { bookStrings } from "@/features/reservation/strings"
import { renderObstacle, renderPortal, renderThreshold } from "./FloorDecor"
import { FloorTile } from "./FloorTile"
import { useFloorZoomPan } from "./useFloorZoomPan"
import type { Tile, TableView, Tone } from "./types"

function tableZoneId(table: Table): string | null {
  return table.zone?.public_id ?? null
}

// Same tiered matching CustomerFloorPlan always used for the real-layout
// path: same zone by id, same zone by public_number, any zone by id, any
// zone by public_number — a stale layout id (table re-published under a new
// public_id) still resolves via public_number.
function findEntityTableMatch(tables: Table[], entity: EditorEntity): Table | undefined {
  const sameZone = (table: Table) => tableZoneId(table) === (entity.zoneId ?? null)
  return (
    tables.find((table) => table.public_id === entity.serverId && sameZone(table)) ??
    tables.find((table) => table.public_number === entity.label && sameZone(table)) ??
    tables.find((table) => table.public_id === entity.serverId) ??
    tables.find((table) => table.public_number === entity.label)
  )
}

// Desktop/mobile-sheet spatial map: a scaled, pan/zoomable viewport over
// FloorPlanView. Owns viewport measurement, zoom/pan and the hover tooltip;
// FloorPlanView owns entity positioning/rotation (the single source of truth
// shared with the waiter and editor floors) via the renderEntity override.
export function FloorMap({
  payload,
  tables,
  viewByPublicId,
  canvasCols,
  canvasRows,
  frame = null,
  selectedZoneId,
  selectedId,
  onSelect,
  onZoneChange,
  zoneNameById,
  guests,
  statusFilter,
  dimTaken,
}: {
  payload: LayoutPayload
  tables: Table[]
  viewByPublicId: Map<string, TableView>
  canvasCols: number
  canvasRows: number
  // Bounding box (grid units) to fit/center on; the mobile sheet opens
  // framed on it instead of the whole (likely mostly empty) canvas.
  frame?: { x: number; y: number; width: number; height: number } | null
  selectedZoneId: string | null
  selectedId: string | null
  onSelect: (table: Table) => void
  onZoneChange: (zoneId: string | null) => void
  zoneNameById: Map<string, string>
  guests: number
  statusFilter: Tone | null
  dimTaken: boolean
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [hovered, setHovered] = useState<Tile | null>(null)

  // Measure the viewport so pan distance can be bound (zoom itself needs no
  // measurement — FloorPlanView fits its own content via CSS aspect-ratio,
  // and a transform:scale doesn't change that content's own layout box).
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setViewportWidth(entries[0].contentRect.width)
      setViewportHeight(entries[0].contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { scale, pan, zoomIn, zoomOut, zoomFit, didPanRef, panHandlers } = useFloorZoomPan(
    viewportWidth,
    viewportHeight,
  )

  // Stable across a hover-only state change — hover never appears in this
  // closure's own dependencies (only its setter, which React guarantees is
  // stable) — so FloorPlanView's memo can bail out entirely on hover instead
  // of re-rendering every table on the floor just to update the tooltip.
  const handleHoverLeave = useCallback((t: Tile) => {
    setHovered((h) => (h?.key === t.key ? null : h))
  }, [])

  const renderEntity = useCallback(
    (
      entity: EditorEntity,
      geometry: { left: number; top: number; width: number; height: number; rotation: number },
      ctx: { selected: boolean; index: number },
    ) => {
      if (entity.type === "table-square" || entity.type === "table-round") {
        const table = findEntityTableMatch(tables, entity)
        const view = table ? viewByPublicId.get(table.public_id) : undefined
        const capacity = table?.capacity ?? entity.capacity ?? 0
        const publicNumber = table?.public_number ?? entity.label ?? ""
        const tile: Tile = {
          key: entity.id,
          table,
          publicNumber,
          capacity,
          shape: entity.type === "table-round" ? "round" : "square",
          tone: view?.tone ?? "free",
          label: view?.label ?? bookStrings.floorPlan.status.free,
          bookable: view?.bookable ?? false,
          perfect: view?.perfect ?? (capacity === guests && Boolean(table)),
        }
        return (
          <FloorTile
            key={entity.id}
            tile={tile}
            geometry={geometry}
            index={ctx.index}
            selected={ctx.selected}
            dimmed={Boolean(
              (statusFilter && tile.tone !== statusFilter) || (dimTaken && !tile.bookable),
            )}
            guests={guests}
            didPanRef={didPanRef}
            onSelect={onSelect}
            onHoverEnter={setHovered}
            onHoverLeave={handleHoverLeave}
          />
        )
      }

      if (entity.type === "obstacle") {
        return renderObstacle(entity.id, geometry)
      }

      if (entity.type === "threshold") {
        return renderThreshold(entity.id, geometry, entity.label)
      }

      // portal
      return renderPortal(entity.id, geometry, {
        label: entity.label,
        targetZoneId: entity.targetZoneId,
        zoneName: entity.targetZoneId ? zoneNameById.get(entity.targetZoneId) : undefined,
        onNavigate: onZoneChange,
      })
    },
    [
      tables,
      viewByPublicId,
      guests,
      statusFilter,
      dimTaken,
      didPanRef,
      onSelect,
      handleHoverLeave,
      onZoneChange,
      zoneNameById,
    ],
  )

  return (
    <div className="c-floor-plan__stage">
      <div className="c-floor-plan__viewport" ref={viewportRef} {...panHandlers}>
        <div
          className="c-floor-plan__zoom-wrap"
          style={{
            transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
          }}
        >
          <FloorPlanView
            payload={payload}
            selectedZoneId={selectedZoneId}
            selectedId={selectedId}
            canvasCols={canvasCols}
            canvasRows={canvasRows}
            frame={frame ?? undefined}
            renderEntity={renderEntity}
            emptyMessage={bookStrings.floorPlan.noTables}
            minScale={0}
          />
        </div>
      </div>

      {hovered && (
        <div className="c-floor-plan__tooltip" aria-hidden="true">
          <span className="c-floor-plan__tooltip-num">
            {bookStrings.floorPlan.tableShort} {hovered.publicNumber}
          </span>
          <span className="c-floor-plan__tooltip-cap">
            <LuUsers aria-hidden="true" />
            {hovered.capacity}
          </span>
          <span
            className={`c-floor-plan__tooltip-status c-floor-plan__tooltip-status--${hovered.tone}`}
          >
            {hovered.label}
          </span>
        </div>
      )}

      <div className="c-floor-plan__zoom">
        <button
          type="button"
          className="c-floor-plan__zoom-btn"
          onClick={zoomIn}
          aria-label={bookStrings.floorPlan.zoomIn}
        >
          <LuPlus aria-hidden="true" />
        </button>
        <button
          type="button"
          className="c-floor-plan__zoom-btn"
          onClick={zoomOut}
          aria-label={bookStrings.floorPlan.zoomOut}
        >
          <LuMinus aria-hidden="true" />
        </button>
        <button
          type="button"
          className="c-floor-plan__zoom-btn"
          onClick={zoomFit}
          aria-label={bookStrings.floorPlan.zoomFit}
        >
          <LuMaximize aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
