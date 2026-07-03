import { useEffect, useRef, useState } from "react"
import { LuMaximize, LuMinus, LuPlus, LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import type { LayoutPayload } from "@/features/editor/types"
import { bookStrings } from "@/features/reservation/strings"
import { FloorDecor } from "./FloorDecor"
import { FloorTile } from "./FloorTile"
import { useFloorZoomPan } from "./useFloorZoomPan"
import type { Tile, Tone } from "./types"

// Desktop spatial map: a scaled, pan/zoomable viewport of the room. Owns viewport
// measurement, zoom/pan and the hover tooltip; the parent computes the tiles/decor.
export function FloorMap({
  tiles,
  obstacles,
  thresholds,
  portals,
  canvasWidth,
  canvasHeight,
  selectedId,
  onSelect,
  onZoneChange,
  zoneNameById,
  guests,
  statusFilter,
  dimTaken,
}: {
  tiles: Tile[]
  obstacles: LayoutPayload["obstacles"]
  thresholds: LayoutPayload["thresholds"]
  portals: LayoutPayload["portals"]
  canvasWidth: number
  canvasHeight: number
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
  const [hovered, setHovered] = useState<Tile | null>(null)

  // Measure the viewport so the canvas can be scaled to fit.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setViewportWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { scale, zoomIn, zoomOut, zoomFit, didPanRef, panHandlers } = useFloorZoomPan(
    viewportRef,
    canvasWidth,
    viewportWidth,
  )

  return (
    <div className="c-floor-plan__stage">
      <div className="c-floor-plan__viewport" ref={viewportRef} {...panHandlers}>
        <div
          className="c-floor-plan__canvas-wrap"
          style={{ width: canvasWidth * scale, height: canvasHeight * scale }}
        >
          <div
            className="c-floor-plan__canvas"
            style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})` }}
          >
            <FloorDecor
              obstacles={obstacles}
              thresholds={thresholds}
              portals={portals}
              zoneNameById={zoneNameById}
              onPortalNavigate={onZoneChange}
            />

            {tiles.map((tile, i) => (
              <FloorTile
                key={tile.key}
                tile={tile}
                index={i}
                selected={selectedId === tile.table?.public_id}
                dimmed={Boolean(
                  (statusFilter && tile.tone !== statusFilter) || (dimTaken && !tile.bookable),
                )}
                guests={guests}
                didPanRef={didPanRef}
                onSelect={onSelect}
                onHoverEnter={setHovered}
                onHoverLeave={(t) => setHovered((h) => (h?.key === t.key ? null : h))}
              />
            ))}
          </div>
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
