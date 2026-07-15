import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LuMaximize, LuMinus, LuPlus, LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import { deserializeLayout } from "@/features/editor/types"
import type { EditorEntity, LayoutPayload } from "@/features/editor/types"
import { FloorPlanView } from "@/features/floorplan/FloorPlanView"
import { useBookStrings } from "@/features/reservation/strings"
import { renderObstacle, renderPortal, renderThreshold } from "./FloorDecor"
import { FloorTile } from "./FloorTile"
import { useFloorZoomPan } from "./useFloorZoomPan"
import type { Tile, TableView, Tone } from "./types"

// Same tiered matching CustomerFloorPlan always used for the real-layout
// path: same zone by id, same zone by public_number, any zone by id, any
// zone by public_number — a stale layout id (table re-published under a new
// public_id) still resolves via public_number. Prebuilt maps make each entity
// an O(1) lookup instead of four linear scans; first table wins duplicate
// keys, mirroring the old Array.find semantics. "" stands in for "no zone" on
// both sides (a real zone public_id is a uuid, never empty).
interface TableLookups {
  byZoneAndId: Map<string, Table>
  byZoneAndNumber: Map<string, Table>
  byId: Map<string, Table>
  byNumber: Map<string, Table>
}

function buildTableLookups(tables: Table[]): TableLookups {
  const byZoneAndId = new Map<string, Table>()
  const byZoneAndNumber = new Map<string, Table>()
  const byId = new Map<string, Table>()
  const byNumber = new Map<string, Table>()
  const setFirst = (map: Map<string, Table>, key: string, table: Table) => {
    if (!map.has(key)) map.set(key, table)
  }
  for (const table of tables) {
    const zone = table.zone?.public_id ?? ""
    setFirst(byZoneAndId, `${zone}|${table.public_id}`, table)
    setFirst(byZoneAndNumber, `${zone}|${table.public_number}`, table)
    setFirst(byId, table.public_id, table)
    setFirst(byNumber, table.public_number, table)
  }
  return { byZoneAndId, byZoneAndNumber, byId, byNumber }
}

function matchEntityTable(lookups: TableLookups, entity: EditorEntity): Table | undefined {
  const zone = entity.zoneId ?? ""
  return (
    (entity.serverId ? lookups.byZoneAndId.get(`${zone}|${entity.serverId}`) : undefined) ??
    (entity.label ? lookups.byZoneAndNumber.get(`${zone}|${entity.label}`) : undefined) ??
    (entity.serverId ? lookups.byId.get(entity.serverId) : undefined) ??
    (entity.label ? lookups.byNumber.get(entity.label) : undefined)
  )
}

function buildTile(
  lookups: TableLookups,
  entity: EditorEntity,
  viewByPublicId: Map<string, TableView>,
  guests: number,
  freeLabel: string,
): Tile {
  const table = matchEntityTable(lookups, entity)
  const view = table ? viewByPublicId.get(table.public_id) : undefined
  const capacity = table?.capacity ?? entity.capacity ?? 0
  return {
    key: entity.id,
    table,
    publicNumber: table?.public_number ?? entity.label ?? "",
    capacity,
    shape: entity.type === "table-round" ? "round" : "square",
    tone: view?.tone ?? "free",
    label: view?.label ?? freeLabel,
    bookable: view?.bookable ?? false,
    perfect: view?.perfect ?? (capacity === guests && Boolean(table)),
  }
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
  const bookStrings = useBookStrings()
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

  const lookups = useMemo(() => buildTableLookups(tables), [tables])

  // Tiles are precomputed with stable identities — a fresh tile object per
  // render defeated FloorTile's memo, re-rendering every tile on any
  // selection change. Keyed by entity.id: table entities derive their id from
  // serverId, so this parse and FloorPlanView's internal one agree on it (the
  // renderEntity fallback covers the rare id-less entity, where
  // deserializeLayout mints a random id per parse).
  const tileByEntityId = useMemo(() => {
    const freeLabel = bookStrings.floorPlan.status.free
    const tiles = new Map<string, Tile>()
    for (const entity of deserializeLayout(payload)) {
      if (entity.type === "table-square" || entity.type === "table-round") {
        tiles.set(entity.id, buildTile(lookups, entity, viewByPublicId, guests, freeLabel))
      }
    }
    return tiles
    return tiles
  }, [payload, lookups, viewByPublicId, guests])

  const renderEntity = useCallback(
    (
      entity: EditorEntity,
      geometry: { left: number; top: number; width: number; height: number; rotation: number },
      ctx: { selected: boolean; index: number },
    ) => {
      if (entity.type === "table-square" || entity.type === "table-round") {
        const tile =
          tileByEntityId.get(entity.id) ??
          buildTile(lookups, entity, viewByPublicId, guests, bookStrings.floorPlan.status.free)
        return (
          <FloorTile
            key={entity.id}
            tile={tile}
            geometry={geometry}
            index={ctx.index}
            // Not ctx.selected: FloorPlanView computes that from the raw
            // entity's serverId only, but this tile's own identity (and
            // what onSelect below actually books) comes from buildTile's
            // tiered match — serverId, falling back to public_number when
            // the layout's serverId is stale. A tile matched only via that
            // fallback is bookable but would never show as selected if we
            // used ctx.selected, since its serverId doesn't equal selectedId.
            selected={tile.table?.public_id === selectedId}
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
      tileByEntityId,
      lookups,
      viewByPublicId,
      guests,
      statusFilter,
      dimTaken,
      didPanRef,
      onSelect,
      handleHoverLeave,
      onZoneChange,
      zoneNameById,
      selectedId,
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
