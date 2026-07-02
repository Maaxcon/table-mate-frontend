import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { LuPlus, LuUsers, LuDoorOpen, LuArrowRight } from "react-icons/lu"
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
  // The slot time the guest picked (HH:MM), shown in the free-count pill.
  slotTime?: string | null
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
  publicNumber: string
  capacity: number
  x: number
  y: number
  w: number
  h: number
  rotation: number
  shape: "square" | "round"
  tone: Tone
  label: string
  bookable: boolean
  perfect: boolean
}

function tableZoneId(table: Table): string | null {
  return table.zone?.public_id ?? null
}

function findLayoutTableMatch(tables: Table[], layoutTable: LayoutPayload["tables"][number]) {
  const sameZone = (table: Table) => tableZoneId(table) === layoutTable.zone_id

  return (
    tables.find((table) => table.public_id === layoutTable.id && sameZone(table)) ??
    tables.find((table) => table.public_number === layoutTable.public_number && sameZone(table)) ??
    tables.find((table) => table.public_id === layoutTable.id) ??
    tables.find((table) => table.public_number === layoutTable.public_number)
  )
}

// Position + rotation style for ANY layout element (walls, doorways, portals,
// and future shapes). Rotation goes through the --rot CSS variable so a single
// `.c-floor-plan__piece` rule handles it for every element type — add a new shape
// and it can rotate with no extra JS.
const pieceStyle = (el: {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}): CSSProperties =>
  ({
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    "--rot": `${el.rotation ?? 0}deg`,
  }) as CSSProperties

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
  slotTime = null,
  payload = null,
}: CustomerFloorPlanProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [onlyFree, setOnlyFree] = useState(false)
  // Legend doubles as a filter: pick a status and the rest dim out.
  const [statusFilter, setStatusFilter] = useState<Tone | null>(null)
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

        // Exact-fit table for the party — worth highlighting as "perfect".
        const perfect = bookable && guests > 0 && t.capacity === guests

        return { table: t, tone, label, bookable, perfect }
      }),
    [tables, slotAvailability, guests, upcomingReservations, currentTime],
  )

  const viewByPublicId = useMemo(
    () => new Map(tableViews.map((v) => [v.table.public_id, v])),
    [tableViews],
  )

  const zoneNameById = useMemo(() => new Map(zones.map((z) => [z.public_id, z.name])), [zones])

  // Spatial layout: real coordinates from the published editor layout when present,
  // otherwise a tidy auto grid. Both render the same visual table tiles.
  const { tiles, obstacles, thresholds, portals, canvasWidth, canvasHeight } = useMemo(() => {
    const layoutTables = payload?.tables ?? []
    if (layoutTables.length > 0) {
      const activeZone = zones.find((z) => z.public_id === selectedZone) ?? zones[0]
      const tiles: Tile[] = layoutTables
        .filter((lt) => !selectedZone || lt.zone_id === selectedZone)
        .map((lt) => {
          const table = findLayoutTableMatch(tables, lt)
          const view = table ? viewByPublicId.get(table.public_id) : undefined
          const capacity = table?.capacity ?? lt.capacity
          const publicNumber = table?.public_number ?? lt.public_number
          return {
            key: lt.id ?? lt.public_number,
            table,
            publicNumber,
            capacity,
            x: lt.x,
            y: lt.y,
            w: lt.width,
            h: lt.height,
            rotation: lt.rotation ?? 0,
            shape: lt.shape === "round" ? "round" : "square",
            tone: view?.tone ?? "free",
            label: view?.label ?? bookStrings.floorPlan.status.free,
            bookable: view?.bookable ?? false,
            perfect: view?.perfect ?? (capacity === guests && Boolean(table)),
          }
        })
      const inZone = <T extends { zone_id: string | null }>(e: T) =>
        !selectedZone || e.zone_id === selectedZone
      return {
        tiles,
        obstacles: (payload?.obstacles ?? []).filter(inZone),
        thresholds: (payload?.thresholds ?? []).filter(inZone),
        portals: (payload?.portals ?? []).filter(inZone),
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
      publicNumber: v.table.public_number,
      capacity: v.table.capacity,
      x: CANVAS_PADDING + (i % cols) * GRID_SPACING,
      y: CANVAS_PADDING + Math.floor(i / cols) * GRID_SPACING,
      w: 200,
      h: 200,
      rotation: 0,
      shape: "square",
      tone: v.tone,
      label: v.label,
      bookable: v.bookable,
      perfect: v.perfect,
    }))
    return {
      tiles,
      obstacles: [] as LayoutPayload["obstacles"],
      thresholds: [] as LayoutPayload["thresholds"],
      portals: [] as LayoutPayload["portals"],
      canvasWidth: (cols - 1) * GRID_SPACING + TABLE_FOOTPRINT + CANVAS_PADDING * 2,
      canvasHeight: (rows - 1) * GRID_SPACING + TABLE_FOOTPRINT + CANVAS_PADDING * 2,
    }
  }, [payload, zones, selectedZone, tables, tableViews, viewByPublicId, guests])

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
      <div className="c-floor-plan__head">
        <h2 className="c-floor-plan__title">{bookStrings.floorPlan.title}</h2>
        <span className="c-floor-plan__count">
          <span className="c-floor-plan__count-num">{freeCount}</span>
          вільно{slotTime ? ` на ${slotTime}` : ""}
        </span>
      </div>
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
              {visibleTableViews.map(({ table, tone, label, bookable, perfect }, i) => (
                <li key={table.public_id}>
                  <button
                    type="button"
                    className={[
                      "c-floor-plan__card",
                      `c-floor-plan__card--${tone}`,
                      selectedId === table.public_id ? "c-floor-plan__card--selected" : "",
                      perfect ? "c-floor-plan__card--perfect" : "",
                      statusFilter && tone !== statusFilter ? "c-floor-plan__card--dimmed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ animationDelay: `${Math.min(i, 20) * 45}ms` }}
                    onClick={() => onSelect(table)}
                    disabled={!bookable}
                    aria-label={bookStrings.floorPlan.tableAria(
                      table.public_number,
                      table.capacity,
                      label,
                    )}
                  >
                    {perfect && (
                      <span className="c-floor-plan__card-perfect" title={`Саме на ${guests}`}>
                        ★ {guests}
                      </span>
                    )}
                    <span
                      className={`c-floor-plan__card-table c-floor-plan__table--${tone}`}
                      aria-hidden="true"
                    >
                      <TableSeats capacity={table.capacity} shape="square" size={60} />
                      <span className="c-floor-plan__surface c-floor-plan__card-surface">
                        <span className="c-floor-plan__card-table-num">{table.public_number}</span>
                      </span>
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
            {/* Walls / pillars — solid blocks the guests can't sit at. */}
            {obstacles.map((o, i) => (
              <div
                key={`obstacle-${i}`}
                className="c-floor-plan__piece c-floor-plan__obstacle"
                aria-hidden="true"
                style={pieceStyle(o)}
              />
            ))}

            {/* Thresholds — doorways / passages. */}
            {thresholds.map((t, i) => (
              <div
                key={`threshold-${i}`}
                className="c-floor-plan__piece c-floor-plan__threshold"
                aria-hidden="true"
                style={pieceStyle(t)}
              >
                {t.label ? <span className="c-floor-plan__threshold-label">{t.label}</span> : null}
              </div>
            ))}

            {/* Portals — tap to jump to the linked zone (terrace, etc.). */}
            {portals.map((p, i) => (
              <button
                key={`portal-${i}`}
                type="button"
                className="c-floor-plan__piece c-floor-plan__portal"
                onClick={() => p.target_zone_id && onZoneChange(p.target_zone_id)}
                disabled={!p.target_zone_id}
                style={pieceStyle(p)}
              >
                <LuArrowRight aria-hidden="true" />
                <span className="c-floor-plan__portal-label">
                  {p.portal_label || p.label || zoneNameById.get(p.target_zone_id ?? "") || "→"}
                </span>
              </button>
            ))}

            {tiles.map((tile, i) => (
              <button
                key={tile.key}
                type="button"
                className={[
                  "c-floor-plan__table",
                  `c-floor-plan__table--${tile.tone}`,
                  `c-floor-plan__table--${tile.shape}`,
                  selectedId === tile.table?.public_id ? "c-floor-plan__table--selected" : "",
                  tile.perfect ? "c-floor-plan__table--perfect" : "",
                  statusFilter && tile.tone !== statusFilter ? "c-floor-plan__table--dimmed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    left: tile.x,
                    top: tile.y,
                    width: tile.w,
                    height: tile.h,
                    animationDelay: `${Math.min(i, 24) * 35}ms`,
                    "--rot": `${tile.rotation}deg`,
                  } as CSSProperties
                }
                onClick={() => tile.table && onSelect(tile.table)}
                disabled={!tile.bookable || !tile.table}
                aria-label={bookStrings.floorPlan.tableAria(
                  tile.publicNumber,
                  tile.capacity,
                  tile.label,
                )}
              >
                <TableSeats capacity={tile.capacity} shape={tile.shape} size={tile.w} />

                {tile.perfect && (
                  <span className="c-floor-plan__perfect" title={`Саме на ${guests}`}>
                    ★ {guests}
                  </span>
                )}

                <span className="c-floor-plan__surface">
                  <span
                    className={`c-floor-plan__table-badge c-floor-plan__table-badge--${tile.tone}`}
                  >
                    {tile.label}
                  </span>

                  <span className="c-floor-plan__table-number">{tile.publicNumber}</span>

                  <div className="c-floor-plan__table-meta">
                    <span className="c-floor-plan__table-capacity">
                      {bookStrings.floorPlan.seats(tile.capacity)}
                    </span>
                  </div>
                </span>
              </button>
            ))}
          </div>
          <span className="c-floor-plan__entrance">
            <LuDoorOpen aria-hidden="true" />
            Вхід
          </span>
        </div>
      )}

      <div className="c-floor-plan__legend">
        {(["free", "reserved", "occupied"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={[
              "c-floor-plan__legend-item",
              `c-floor-plan__legend-item--${s}`,
              statusFilter === s ? "c-floor-plan__legend-item--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setStatusFilter((prev) => (prev === s ? null : s))}
            aria-pressed={statusFilter === s}
          >
            {bookStrings.floorPlan.status[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
