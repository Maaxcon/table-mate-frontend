import { useEffect, useMemo, useRef, useState } from "react"
import { LuPlus, LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import type { FloorTable, UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import { getTableVisualStatus } from "@/features/waiter-order-view/data/waiterTypes"
import { GRID } from "@/features/editor/types"
import type { LayoutPayload } from "@/features/editor/types"
import type { Zone } from "@/features/reservation/api"
import { bookStrings } from "@/features/reservation/strings"
import { DEFAULT_GUESTS } from "@/features/reservation/utils"
import "./CustomerFloorPlan.css"

interface CustomerFloorPlanProps {
  tables: Table[]
  zones: Zone[]
  selectedZone: string | null
  onZoneChange: (zoneId: string | null) => void
  selectedId: string | null
  onSelect: (table: Table) => void
  upcomingReservations?: UpcomingReservation[]
  // Per-table availability for the slot the guest picked (table public_id -> free).
  // When present, statuses reflect that slot instead of the current moment.
  slotAvailability?: Record<string, boolean> | null
  guests?: number
  // The published editor layout. When present the tables sit at their real
  // positions; otherwise they fall back to a tidy auto grid.
  payload?: LayoutPayload | null
}

// Auto-grid fallback (no published layout): table box + seat ring footprint, and
// the gap between tables, in px.
const TABLE_FOOTPRINT = 210
const GRID_SPACING = 240
const CANVAS_PADDING = 28
// Below this width the spatial map is too cramped, so we swap to a card list.
const MOBILE_BREAKPOINT = 640

type Tone = "free" | "reserved" | "occupied"

interface Tile {
  key: string
  table: Table | undefined
  x: number
  y: number
  w: number
  h: number
  shape: "square" | "round"
  tone: Tone
  label: string
  bookable: boolean
}

// Tracks whether the viewport is in the mobile (card-list) range.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return isMobile
}

// Chairs arranged around a table. Round tables get an even ring; square/rectangular
// ones seat guests along each edge so the chairs sit right against the table.
function TableSeats({
  capacity,
  shape,
  size = 150,
}: {
  capacity: number
  shape: string
  size?: number
}) {
  const n = Math.max(0, Math.min(capacity, 14))

  if (shape === "round") {
    // Radius scales with the table so chairs sit just outside the edge at any
    // size (a fixed radius tucked them under larger tables).
    const radius = size / 2 + 10
    return (
      <span className="c-floor-plan__seats c-floor-plan__seats--ring" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            className="c-floor-plan__seat"
            style={{
              transform: `translate(-50%, -50%) rotate(${(360 / n) * i}deg) translateY(-${radius}px)`,
            }}
          />
        ))}
      </span>
    )
  }

  // Square tables seat guests on all four sides for a balanced look.
  const per = Math.floor(n / 4)
  const counts = { top: per, bottom: per, left: per, right: per }
  const order: (keyof typeof counts)[] = ["top", "bottom", "left", "right"]
  for (let i = 0; i < n - per * 4; i++) counts[order[i]]++
  const { top, bottom, left, right } = counts

  const side = (cls: string, count: number) =>
    count > 0 && (
      <span className={`c-floor-plan__seats c-floor-plan__seats--${cls}`} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="c-floor-plan__seat" />
        ))}
      </span>
    )

  return (
    <>
      {side("top", top)}
      {side("bottom", bottom)}
      {side("left", left)}
      {side("right", right)}
    </>
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
  slotAvailability = null,
  guests = DEFAULT_GUESTS,
  payload = null,
}: CustomerFloorPlanProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [onlyFree, setOnlyFree] = useState(false)
  const isMobile = useIsMobile()

  // The minute tick only matters for the now-based fallback status; when slot
  // availability drives the statuses, currentTime is unused, so skip the timer.
  useEffect(() => {
    if (slotAvailability) return
    const id = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [slotAvailability])

  // Measure the viewport so the canvas can be scaled down to fit any screen.
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
  }, [isMobile])

  // Each table paired with a visual tone (free/reserved/occupied), a status label,
  // and whether it can be booked for the chosen slot. With slot availability we
  // reflect that slot; otherwise we fall back to the current-moment status.
  const tableViews = useMemo(
    () =>
      tables.map((t) => {
        let tone: Tone
        let label: string
        let bookable: boolean

        if (slotAvailability) {
          if (guests > t.capacity) {
            tone = "occupied"
            label = bookStrings.floorPlan.statusSmall
            bookable = false
          } else if (slotAvailability[t.public_id]) {
            tone = "free"
            label = bookStrings.floorPlan.status.free
            bookable = true
          } else {
            tone = "reserved"
            label = bookStrings.floorPlan.statusBooked
            bookable = false
          }
        } else {
          const ft: FloorTable = {
            public_id: t.public_id,
            public_number: t.public_number,
            capacity: t.capacity,
            shape: "square",
            is_occupied: t.is_occupied ?? false,
            position_x: null,
            position_y: null,
            active: t.active ?? true,
            zone: t.zone ?? null,
          }
          tone = getTableVisualStatus(ft, upcomingReservations, currentTime)
          label = bookStrings.floorPlan.status[tone] ?? tone
          bookable = true
        }

        return { table: t, tone, label, bookable }
      }),
    [tables, slotAvailability, guests, upcomingReservations, currentTime],
  )

  const viewByPublicId = useMemo(
    () => new Map(tableViews.map((v) => [v.table.public_id, v])),
    [tableViews],
  )

  // Spatial layout: real coordinates from the published editor layout when present,
  // otherwise a tidy auto grid. Both render the same visual table tiles.
  const { tiles, canvasWidth, canvasHeight } = useMemo(() => {
    const layoutTables = payload?.tables ?? []
    if (layoutTables.length > 0) {
      const activeZone = zones.find((z) => z.public_id === selectedZone) ?? zones[0]
      const tiles: Tile[] = layoutTables
        .filter((lt) => !selectedZone || lt.zone_id === selectedZone)
        .map((lt) => {
          const table =
            tables.find((t) => t.public_id === lt.id) ??
            tables.find((t) => t.public_number === lt.public_number)
          const view = table ? viewByPublicId.get(table.public_id) : undefined
          return {
            key: lt.id ?? lt.public_number,
            table,
            x: lt.x,
            y: lt.y,
            w: lt.width,
            h: lt.height,
            shape: lt.shape === "round" ? "round" : "square",
            tone: view?.tone ?? "free",
            label: view?.label ?? bookStrings.floorPlan.status.free,
            bookable: view?.bookable ?? false,
          }
        })
      return {
        tiles,
        canvasWidth: (activeZone?.canvas_cols ?? 20) * GRID,
        canvasHeight: (activeZone?.canvas_rows ?? 20) * GRID,
      }
    }

    // Fallback: auto grid over the tables we have (no positions in the backend).
    const cols = Math.max(1, Math.round(Math.sqrt(tableViews.length * 1.6)))
    const rows = Math.max(1, Math.ceil(tableViews.length / cols))
    const tiles: Tile[] = tableViews.map((v, i) => ({
      key: v.table.public_id,
      table: v.table,
      x: CANVAS_PADDING + (i % cols) * GRID_SPACING,
      y: CANVAS_PADDING + Math.floor(i / cols) * GRID_SPACING,
      w: 200,
      h: 200,
      shape: "square",
      tone: v.tone,
      label: v.label,
      bookable: v.bookable,
    }))
    return {
      tiles,
      canvasWidth: (cols - 1) * GRID_SPACING + TABLE_FOOTPRINT + CANVAS_PADDING * 2,
      canvasHeight: (rows - 1) * GRID_SPACING + TABLE_FOOTPRINT + CANVAS_PADDING * 2,
    }
  }, [payload, zones, selectedZone, tables, tableViews, viewByPublicId])

  const scale = viewportWidth > 0 ? Math.min(1, viewportWidth / canvasWidth) : 1

  // Mobile order: tables that seat the party first, tightest fit on top, free
  // before booked, then by number.
  const sortedTableViews = useMemo(() => {
    const fits = (capacity: number) => capacity >= guests
    const byNumber = (a: { table: Table }, b: { table: Table }) =>
      String(a.table.public_number).localeCompare(String(b.table.public_number), undefined, {
        numeric: true,
      })

    return [...tableViews].sort((a, b) => {
      const aFits = fits(a.table.capacity)
      const bFits = fits(b.table.capacity)
      if (aFits !== bFits) return aFits ? -1 : 1
      if (aFits) {
        if (a.table.capacity !== b.table.capacity) return a.table.capacity - b.table.capacity
        if (a.bookable !== b.bookable) return a.bookable ? -1 : 1
      }
      return byNumber(a, b)
    })
  }, [tableViews, guests])

  const freeCount = useMemo(() => tableViews.filter((v) => v.bookable).length, [tableViews])
  const visibleTableViews = onlyFree ? sortedTableViews.filter((v) => v.bookable) : sortedTableViews

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

      {isMobile ? (
        <>
          <div className="c-floor-plan__filters" role="group">
            <button
              type="button"
              className={`c-floor-plan__filter ${!onlyFree ? "c-floor-plan__filter--active" : ""}`}
              onClick={() => setOnlyFree(false)}
            >
              {bookStrings.floorPlan.filterAll}
              <span className="c-floor-plan__filter-count">{sortedTableViews.length}</span>
            </button>
            <button
              type="button"
              className={`c-floor-plan__filter ${onlyFree ? "c-floor-plan__filter--active" : ""}`}
              onClick={() => setOnlyFree(true)}
            >
              {bookStrings.floorPlan.filterFree}
              <span className="c-floor-plan__filter-count">{freeCount}</span>
            </button>
          </div>

          {visibleTableViews.length === 0 ? (
            <div className="c-floor-plan__empty">
              <p className="c-floor-plan__empty-text">{bookStrings.floorPlan.noFree}</p>
              {onlyFree && sortedTableViews.length > 0 && (
                <button
                  type="button"
                  className="c-floor-plan__empty-btn"
                  onClick={() => setOnlyFree(false)}
                >
                  {bookStrings.floorPlan.showAll}
                  <span className="c-floor-plan__filter-count">{sortedTableViews.length}</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="c-floor-plan__list">
              {visibleTableViews.map(({ table, tone, label, bookable }) => (
                <li key={table.public_id}>
                  <button
                    type="button"
                    className={[
                      "c-floor-plan__card",
                      `c-floor-plan__card--${tone}`,
                      selectedId === table.public_id ? "c-floor-plan__card--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onSelect(table)}
                    disabled={!bookable}
                    aria-label={bookStrings.floorPlan.tableAria(
                      table.public_number,
                      table.capacity,
                      label,
                    )}
                  >
                    <span className="c-floor-plan__card-chip">
                      <span className="c-floor-plan__card-chip-label">
                        {bookStrings.floorPlan.tableShort}
                      </span>
                      <span className="c-floor-plan__card-chip-num">{table.public_number}</span>
                    </span>

                    <span className="c-floor-plan__card-cap">
                      <LuUsers aria-hidden="true" />
                      {bookStrings.floorPlan.seats(table.capacity)}
                    </span>

                    {bookable ? (
                      <span className="c-floor-plan__card-cta">
                        <LuPlus aria-hidden="true" />
                        {bookStrings.floorPlan.choose}
                      </span>
                    ) : (
                      <span
                        className={`c-floor-plan__table-badge c-floor-plan__table-badge--${tone} c-floor-plan__card-badge`}
                      >
                        {label}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div
          className="c-floor-plan__viewport"
          ref={viewportRef}
          style={{ height: canvasHeight * scale }}
        >
          <div
            className="c-floor-plan__canvas"
            style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})` }}
          >
            {tiles.map((tile) => (
              <button
                key={tile.key}
                type="button"
                className={[
                  "c-floor-plan__table",
                  `c-floor-plan__table--${tile.tone}`,
                  `c-floor-plan__table--${tile.shape}`,
                  selectedId === tile.table?.public_id ? "c-floor-plan__table--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h }}
                onClick={() => tile.table && onSelect(tile.table)}
                disabled={!tile.bookable || !tile.table}
                aria-label={bookStrings.floorPlan.tableAria(
                  tile.table?.public_number ?? "",
                  tile.table?.capacity ?? 0,
                  tile.label,
                )}
              >
                <TableSeats capacity={tile.table?.capacity ?? 0} shape={tile.shape} size={tile.w} />

                <span className="c-floor-plan__surface">
                  <span
                    className={`c-floor-plan__table-badge c-floor-plan__table-badge--${tile.tone}`}
                  >
                    {tile.label}
                  </span>

                  <span className="c-floor-plan__table-number">
                    {tile.table?.public_number ?? ""}
                  </span>

                  <div className="c-floor-plan__table-meta">
                    <span className="c-floor-plan__table-capacity">
                      {bookStrings.floorPlan.seats(tile.table?.capacity ?? 0)}
                    </span>
                  </div>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
