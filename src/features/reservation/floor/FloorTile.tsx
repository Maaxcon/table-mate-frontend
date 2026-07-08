import { memo, type CSSProperties, type RefObject } from "react"
import { LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import { bookStrings } from "@/features/reservation/strings"
import { TableSeats } from "./TableSeats"
import type { Tile } from "./types"

export interface TileGeometry {
  left: number
  top: number
  width: number
  height: number
  rotation: number
}

// One positioned table on the spatial map: chairs, status tone, number, and a
// seats chip. Clickable to book unless taken; a big hover tooltip is driven by
// the parent via onHoverEnter/Leave. Position/rotation come from `geometry`
// (FloorPlanView's renderEntity callback) — this component owns visuals only.
// Memoized: with stable tile/geometry/callback props, hovering or selecting
// one table must not re-render every other table on the floor.
export const FloorTile = memo(function FloorTile({
  tile,
  geometry,
  index,
  selected,
  dimmed,
  guests,
  didPanRef,
  onSelect,
  onHoverEnter,
  onHoverLeave,
}: {
  tile: Tile
  geometry: TileGeometry
  index: number
  selected: boolean
  dimmed: boolean
  guests: number
  didPanRef: RefObject<boolean>
  onSelect: (table: Table) => void
  onHoverEnter: (tile: Tile) => void
  onHoverLeave: (tile: Tile) => void
}) {
  return (
    <button
      type="button"
      className={[
        "c-floor-plan__table",
        `c-floor-plan__table--${tile.tone}`,
        `c-floor-plan__table--${tile.shape}`,
        selected ? "c-floor-plan__table--selected" : "",
        tile.perfect ? "c-floor-plan__table--perfect" : "",
        dimmed ? "c-floor-plan__table--dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => {
        if (!dimmed && tile.table) onHoverEnter(tile)
      }}
      onMouseLeave={() => onHoverLeave(tile)}
      style={
        {
          left: geometry.left,
          top: geometry.top,
          width: geometry.width,
          height: geometry.height,
          animationDelay: `${Math.min(index, 24) * 35}ms`,
          "--rot": `${geometry.rotation}deg`,
        } as CSSProperties
      }
      onClick={() => {
        if (didPanRef.current) return
        if (tile.table) onSelect(tile.table)
      }}
      // Dimmed = filtered out by the legend/only-free toggle: it already
      // suppresses hover, so it must not stay clickable or tabbable either.
      disabled={!tile.bookable || !tile.table || dimmed}
      aria-label={bookStrings.floorPlan.tableAria(tile.publicNumber, tile.capacity, tile.label)}
    >
      <TableSeats capacity={tile.capacity} shape={tile.shape} size={geometry.width} />

      {tile.perfect && (
        <span className="c-floor-plan__perfect" title={bookStrings.floorPlan.perfectFit(guests)}>
          ★ {guests}
        </span>
      )}

      <span className="c-floor-plan__surface">
        <span className="c-floor-plan__content">
          <span className={`c-floor-plan__table-badge c-floor-plan__table-badge--${tile.tone}`}>
            {tile.label}
          </span>

          <span className="c-floor-plan__table-number">{tile.publicNumber}</span>

          <span className="c-floor-plan__table-capacity">
            <LuUsers aria-hidden="true" />
            {tile.capacity}
          </span>
        </span>
      </span>
    </button>
  )
})
