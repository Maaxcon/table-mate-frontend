import { useEffect, useMemo, useState } from "react"
import { LuMap, LuX } from "react-icons/lu"
import type { Table } from "@/types/api/types.gen"
import type { FloorTable, UpcomingReservation } from "@/features/waiter-order-view/data/waiterTypes"
import { getTableVisualStatus } from "@/features/waiter-order-view/data/waiterTypes"
import { GRID } from "@/features/editor/types"
import type { LayoutPayload } from "@/features/editor/types"
import type { Zone } from "@/features/reservation/api"
import { bookStrings } from "@/features/reservation/strings"
import { DEFAULT_GUESTS } from "@/features/reservation/utils"
import { FloorCardList } from "./floor/FloorCardList"
import { FloorMap } from "./floor/FloorMap"
import type { Tile, Tone } from "./floor/types"
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

// Bounding box of everything placed on the floor (tables + decor), in canvas px.
// Lets the mobile map open framed on the content, not the whole empty room, so
// tables read large on first open.
type Box = { x: number; y: number; width: number; height: number }
function contentBoundsOf(
  tiles: Tile[],
  ...decor: Box[][]
): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const t of tiles) {
    minX = Math.min(minX, t.x)
    minY = Math.min(minY, t.y)
    maxX = Math.max(maxX, t.x + t.w)
    maxY = Math.max(maxY, t.y + t.h)
  }
  for (const arr of decor) {
    for (const e of arr) {
      minX = Math.min(minX, e.x)
      minY = Math.min(minY, e.y)
      maxX = Math.max(maxX, e.x + e.width)
      maxY = Math.max(maxY, e.y + e.height)
    }
  }
  if (!Number.isFinite(minX)) return null
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
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

// Orchestrates the customer floor: computes each table's slot-aware state and the
// spatial tiles/decor, then renders the header, zones, the map (desktop) or card
// list (mobile), and the status legend/filter. Heavy pieces live in ./floor/*.
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
  // Desktop "only free" — dims tables you can't book so free ones pop.
  const [dimTaken, setDimTaken] = useState(false)
  // Mobile: the spatial map opens in a full-screen sheet on demand.
  const [mapOpen, setMapOpen] = useState(false)
  const isMobile = useIsMobile()

  // The minute tick only matters for the now-based fallback status; when slot
  // availability drives the statuses, currentTime is unused, so skip the timer.
  useEffect(() => {
    if (slotAvailability) return
    const id = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(id)
  }, [slotAvailability])

  // Close the mobile map sheet on Escape and lock background scroll while open.
  useEffect(() => {
    if (!mapOpen || !isMobile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapOpen(false)
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [mapOpen, isMobile])

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
            label = bookStrings.floorPlan.status.occupied
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
  const { tiles, obstacles, thresholds, portals, canvasWidth, canvasHeight, contentBounds } =
    useMemo(() => {
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
        const obstacles = (payload?.obstacles ?? []).filter(inZone)
        const thresholds = (payload?.thresholds ?? []).filter(inZone)
        const portals = (payload?.portals ?? []).filter(inZone)
        return {
          tiles,
          obstacles,
          thresholds,
          portals,
          canvasWidth: (activeZone?.canvas_cols ?? 20) * GRID,
          canvasHeight: (activeZone?.canvas_rows ?? 20) * GRID,
          contentBounds: contentBoundsOf(tiles, obstacles, thresholds, portals),
        }
      }

      // Fallback: auto grid over the tables we have (no positions in the backend).
      const zoneViews = tableViews.filter(
        (v) => !selectedZone || v.table.zone?.public_id === selectedZone,
      )
      const cols = Math.max(1, Math.round(Math.sqrt(zoneViews.length * 1.6)))
      const rows = Math.max(1, Math.ceil(zoneViews.length / cols))
      const tiles: Tile[] = zoneViews.map((v, i) => ({
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
        contentBounds: contentBoundsOf(tiles),
      }
    }, [payload, zones, selectedZone, tables, tableViews, viewByPublicId, guests])

  // Mobile order: tables that seat the party first, tightest fit on top, free
  // before booked, then by number.
  const sortedTableViews = useMemo(() => {
    const fits = (capacity: number) => capacity >= guests
    const byNumber = (a: { table: Table }, b: { table: Table }) =>
      String(a.table.public_number).localeCompare(String(b.table.public_number), undefined, {
        numeric: true,
      })

    return [...tableViews]
      .filter((v) => !selectedZone || v.table.zone?.public_id === selectedZone)
      .sort((a, b) => {
        const aFits = fits(a.table.capacity)
        const bFits = fits(b.table.capacity)
        if (aFits !== bFits) return aFits ? -1 : 1
        if (aFits) {
          if (a.table.capacity !== b.table.capacity) return a.table.capacity - b.table.capacity
          if (a.bookable !== b.bookable) return a.bookable ? -1 : 1
        }
        return byNumber(a, b)
      })
  }, [tableViews, guests, selectedZone])

  const freeCount = useMemo(
    () =>
      tableViews.filter(
        (v) => v.bookable && (!selectedZone || v.table.zone?.public_id === selectedZone),
      ).length,
    [tableViews, selectedZone],
  )

  // Free-table count per zone, so each zone pill shows where seats are.
  const zoneFreeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const v of tableViews) {
      if (!v.bookable) continue
      const zid = v.table.zone?.public_id
      if (zid) counts.set(zid, (counts.get(zid) ?? 0) + 1)
    }
    return counts
  }, [tableViews])

  const selectedZoneName = selectedZone ? (zoneNameById.get(selectedZone) ?? null) : null
  const visibleTableViews = onlyFree ? sortedTableViews.filter((v) => v.bookable) : sortedTableViews

  return (
    <div className="c-floor-plan">
      <div className="c-floor-plan__head">
        <h2 className="c-floor-plan__title">{bookStrings.floorPlan.title}</h2>
        <div className="c-floor-plan__head-right">
          {!isMobile && (
            <button
              type="button"
              className={`c-floor-plan__only-free ${dimTaken ? "c-floor-plan__only-free--active" : ""}`}
              onClick={() => setDimTaken((v) => !v)}
              aria-pressed={dimTaken}
            >
              {bookStrings.floorPlan.filterFree}
            </button>
          )}
          {!isMobile && (
            <span className="c-floor-plan__count">
              <span className="c-floor-plan__count-num">{freeCount}</span>{" "}
              {bookStrings.floorPlan.freeCount(slotTime)}
            </span>
          )}
        </div>
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
              <span className="c-floor-plan__zone-count">
                {zoneFreeCounts.get(z.public_id) ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {isMobile && (
        <div className="c-floor-plan__zone-bar">
          <div className="c-floor-plan__zone-bar-info">
            <span className="c-floor-plan__zone-bar-name">
              {selectedZoneName ?? bookStrings.floorPlan.title}
            </span>
            <span className="c-floor-plan__zone-bar-count">
              {freeCount} {bookStrings.floorPlan.freeShort}
            </span>
          </div>
          <button type="button" className="c-floor-plan__map-btn" onClick={() => setMapOpen(true)}>
            <LuMap aria-hidden="true" />
            {bookStrings.floorPlan.showMap}
          </button>
        </div>
      )}

      {isMobile ? (
        <FloorCardList
          sortedTableViews={sortedTableViews}
          visibleTableViews={visibleTableViews}
          onlyFree={onlyFree}
          setOnlyFree={setOnlyFree}
          freeCount={freeCount}
          selectedId={selectedId}
          onSelect={onSelect}
          statusFilter={statusFilter}
          guests={guests}
        />
      ) : (
        <FloorMap
          // Remounts on a zone switch, resetting zoom/pan/hover to the overview fit.
          key={selectedZone ?? "all"}
          tiles={tiles}
          obstacles={obstacles}
          thresholds={thresholds}
          portals={portals}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          selectedId={selectedId}
          onSelect={onSelect}
          onZoneChange={onZoneChange}
          zoneNameById={zoneNameById}
          guests={guests}
          statusFilter={statusFilter}
          dimTaken={dimTaken}
        />
      )}

      {isMobile && mapOpen && (
        <div className="c-floor-plan__map-sheet" role="dialog" aria-modal="true">
          <div className="c-floor-plan__map-sheet-head">
            <span className="c-floor-plan__map-sheet-title">
              {selectedZoneName ?? bookStrings.floorPlan.title}
            </span>
            <button
              type="button"
              className="c-floor-plan__map-close"
              onClick={() => setMapOpen(false)}
              aria-label={bookStrings.floorPlan.closeMap}
            >
              <LuX aria-hidden="true" />
            </button>
          </div>
          <FloorMap
            key={selectedZone ?? "all"}
            tiles={tiles}
            obstacles={obstacles}
            thresholds={thresholds}
            portals={portals}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            contentBounds={contentBounds}
            selectedId={selectedId}
            onSelect={(t) => {
              onSelect(t)
              setMapOpen(false)
            }}
            onZoneChange={onZoneChange}
            zoneNameById={zoneNameById}
            guests={guests}
            statusFilter={statusFilter}
            dimTaken={dimTaken}
          />
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
