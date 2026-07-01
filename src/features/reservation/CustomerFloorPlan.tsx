import { useEffect, useMemo, useRef, useState } from "react"
import { LuPlus, LuUsers } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import type { FloorTable, UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import { getTableVisualStatus } from "@/features/waiter-order-view/data/waiterTypes"
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
}

// Footprint reserved per table (table box + the seat ring around it), used to
// size the canvas so scaling never clips a table or its chairs.
const TABLE_FOOTPRINT = 210
// Centre-to-centre spacing between tables in the auto grid (footprint + a gap).
const GRID_SPACING = 240
// Breathing room kept between the tables and the canvas edges.
const CANVAS_PADDING = 28
// Below this width the spatial floor map shrinks too far to be usable, so we
// swap it for a tappable list of table cards instead.
const MOBILE_BREAKPOINT = 640

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

// Chairs arranged around a table. Round tables get an even ring; rectangular
// ones seat guests along the top and bottom edges (banquet style) so the chairs
// always sit right against the table regardless of its width/height.
function TableSeats({ capacity, shape }: { capacity: number; shape: string }) {
  const n = Math.max(0, Math.min(capacity, 14))

  if (shape === "round") {
    const radius = 82
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

  // Square tables seat guests on all four sides for a balanced look; wider
  // rectangles keep guests along the top and bottom edges.
  let top: number
  let bottom: number
  let left = 0
  let right = 0
  if (shape === "square") {
    const per = Math.floor(n / 4)
    const counts = { top: per, bottom: per, left: per, right: per }
    const order: (keyof typeof counts)[] = ["top", "bottom", "left", "right"]
    for (let i = 0; i < n - per * 4; i++) counts[order[i]]++
    ;({ top, bottom, left, right } = counts)
  } else {
    top = Math.ceil(n / 2)
    bottom = n - top
  }

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
}: CustomerFloorPlanProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [onlyFree, setOnlyFree] = useState(false)
  const isMobile = useIsMobile()

  // The minute tick only matters for the now-based fallback status; when slot
  // availability drives the statuses, currentTime is unused, so skip the timer
  // (and the per-minute re-render of the whole list).
  useEffect(() => {
    if (slotAvailability) return
    const id = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [slotAvailability])

  // Measure the viewport so the canvas can be scaled down to fit on any screen.
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

  // The backend no longer stores table coordinates, so lay the tables out in a
  // tidy auto grid (slightly wider than tall so it fills wide screens nicely).
  const { positionById, contentWidth, contentHeight } = useMemo(() => {
    const cols = Math.max(1, Math.round(Math.sqrt(tables.length * 1.6)))
    const rows = Math.max(1, Math.ceil(tables.length / cols))
    const positionById = new Map<string, { x: number; y: number }>()
    tables.forEach((t, i) => {
      positionById.set(t.public_id, {
        x: CANVAS_PADDING + (i % cols) * GRID_SPACING,
        y: CANVAS_PADDING + Math.floor(i / cols) * GRID_SPACING,
      })
    })
    return {
      positionById,
      contentWidth: (cols - 1) * GRID_SPACING + TABLE_FOOTPRINT + CANVAS_PADDING * 2,
      contentHeight: (rows - 1) * GRID_SPACING + TABLE_FOOTPRINT + CANVAS_PADDING * 2,
    }
  }, [tables])

  const scale = viewportWidth > 0 ? Math.min(1, viewportWidth / contentWidth) : 1

  // Each table paired with a visual tone (free/reserved/occupied — drives the
  // colors), a status label, and whether it can be booked for the chosen slot.
  // With slot availability we reflect that slot; otherwise we fall back to the
  // current-moment status while it loads.
  const tableViews = useMemo(
    () =>
      tables.map((t) => {
        let tone: "free" | "reserved" | "occupied"
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
          // Availability unknown (loading or the endpoint failed): show the
          // now-based status for color, but keep tables clickable — occupied
          // *now* doesn't preclude a future booking, and the modal validates.
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

  // Mobile order: tables that seat the party first, tightest fit on top (a 6-top
  // shows before a 12-top), free before booked, then by number. Too-small tables
  // sink to the bottom so the guest scans the right options first.
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
            {tableViews.map(({ table, tone, label, bookable }) => {
              const pos = positionById.get(table.public_id) ?? {
                x: CANVAS_PADDING,
                y: CANVAS_PADDING,
              }
              return (
                <button
                  key={table.public_id}
                  type="button"
                  className={[
                    "c-floor-plan__table",
                    `c-floor-plan__table--${tone}`,
                    "c-floor-plan__table--square",
                    selectedId === table.public_id ? "c-floor-plan__table--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ left: pos.x, top: pos.y }}
                  onClick={() => onSelect(table)}
                  disabled={!bookable}
                  aria-label={bookStrings.floorPlan.tableAria(
                    table.public_number,
                    table.capacity,
                    label,
                  )}
                >
                  <TableSeats capacity={table.capacity} shape="square" />

                  <span className="c-floor-plan__surface">
                    <span
                      className={`c-floor-plan__table-badge c-floor-plan__table-badge--${tone}`}
                    >
                      {label}
                    </span>

                    <span className="c-floor-plan__table-number">{table.public_number}</span>

                    <div className="c-floor-plan__table-meta">
                      <span className="c-floor-plan__table-capacity">
                        {bookStrings.floorPlan.seats(table.capacity)}
                      </span>
                    </div>
                  </span>
                </button>
              )
            })}
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
