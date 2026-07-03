import type { CSSProperties, RefObject } from "react"
import { LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import { bookStrings } from "@/features/reservation/strings"
import { TableSeats } from "./TableSeats"
import type { Tile } from "./types"

// One positioned table on the spatial map: chairs, status tone, number, and a
// seats chip. Clickable to book unless taken; a big hover tooltip is driven by
// the parent via onHoverEnter/Leave.
export function FloorTile({
  tile,
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
          left: tile.x,
          top: tile.y,
          width: tile.w,
          height: tile.h,
          animationDelay: `${Math.min(index, 24) * 35}ms`,
          "--rot": `${tile.rotation}deg`,
        } as CSSProperties
      }
      onClick={() => {
        if (didPanRef.current) return
        if (tile.table) onSelect(tile.table)
      }}
      disabled={!tile.bookable || !tile.table}
      aria-label={bookStrings.floorPlan.tableAria(tile.publicNumber, tile.capacity, tile.label)}
    >
      <TableSeats capacity={tile.capacity} shape={tile.shape} size={tile.w} />

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
}
