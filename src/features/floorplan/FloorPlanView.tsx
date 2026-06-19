import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  CANVAS_H,
  CANVAS_W,
  GRID,
  deserializeLayout,
  type EditorEntity,
  type LayoutPayload,
} from "@/features/editor/types"
import "./FloorPlanView.css"

export type FloorVisualStatus = "free" | "reserved" | "occupied"

/**
 * Identity carried by each layout table, passed to the consumer callbacks so they
 * can join the layout entity to a live table by `id` (the table public_id when the
 * layout was published correctly) and fall back to `publicNumber`.
 */
export interface FloorPlanTableRef {
  id: string
  publicNumber: string
  capacity: number | null
}

interface FloorPlanViewProps {
  /** The published layout payload (LayoutVersion.layout_json / Layout.payload). */
  payload: LayoutPayload | null | undefined
  /** When set, only entities belonging to this zone are shown. */
  selectedZoneId?: string | null
  /** public_id of the currently selected table. */
  selectedId?: string | null
  onTableSelect?: (table: FloorPlanTableRef) => void
  /** Resolve a table's visual status (defaults to "free"). */
  tableStatus?: (table: FloorPlanTableRef) => FloorVisualStatus
  /** Extra content rendered inside a table (badges, guest info, timers, ...). */
  renderTableContent?: (table: FloorPlanTableRef) => ReactNode
  /** Navigate to a portal's target zone on click (makes portals interactive links). */
  onPortalNavigate?: (targetZoneId: string) => void
  /** Shown when there is no published layout to render. */
  emptyMessage?: string
}

const px = (v: number) => v * GRID

/**
 * Read-only renderer that draws a published floor layout exactly as the admin
 * editor does: every entity at its real position/size/shape, plus obstacles,
 * thresholds and portals — uniformly scaled to fit the container. Shared by the
 * customer and waiter floor views so all three stay visually identical.
 */
export function FloorPlanView({
  payload,
  selectedZoneId = null,
  selectedId = null,
  onTableSelect,
  tableStatus,
  renderTableContent,
  onPortalNavigate,
  emptyMessage = "No floor plan published yet.",
}: FloorPlanViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / CANVAS_W)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const entities = useMemo<EditorEntity[]>(
    () => (payload ? deserializeLayout(payload) : []),
    [payload],
  )

  const visible = useMemo(
    () => (selectedZoneId ? entities.filter((e) => e.zoneId === selectedZoneId) : entities),
    [entities, selectedZoneId],
  )

  if (!payload || entities.length === 0) {
    return (
      <div className="fp-view fp-view--empty" ref={containerRef}>
        <p className="fp-view__empty-text">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="fp-view" ref={containerRef} style={{ height: CANVAS_H * scale }}>
      <div
        className="fp-view__stage"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
        }}
      >
        {visible.map((e) =>
          renderEntity(e, {
            selectedId,
            onTableSelect,
            tableStatus,
            renderTableContent,
            onPortalNavigate,
          }),
        )}
      </div>
    </div>
  )
}

interface RenderOpts {
  selectedId: string | null
  onTableSelect?: (table: FloorPlanTableRef) => void
  tableStatus?: (table: FloorPlanTableRef) => FloorVisualStatus
  renderTableContent?: (table: FloorPlanTableRef) => ReactNode
  onPortalNavigate?: (targetZoneId: string) => void
}

function renderEntity(e: EditorEntity, opts: RenderOpts): ReactNode {
  const style = { left: px(e.x), top: px(e.y), width: px(e.w), height: px(e.h) }

  if (e.type === "table-square" || e.type === "table-round") {
    const tableRef: FloorPlanTableRef = {
      id: e.serverId ?? e.id,
      publicNumber: e.label ?? "",
      capacity: e.capacity ?? null,
    }
    const status = opts.tableStatus?.(tableRef) ?? "free"
    const selected = opts.selectedId != null && opts.selectedId === tableRef.id
    return (
      <button
        key={e.id}
        type="button"
        className={[
          "fp-block",
          "fp-block--table",
          `fp-block--${e.type}`,
          `fp-block--${status}`,
          selected ? "fp-block--selected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={style}
        onClick={opts.onTableSelect ? () => opts.onTableSelect?.(tableRef) : undefined}
      >
        {opts.renderTableContent ? (
          opts.renderTableContent(tableRef)
        ) : (
          <>
            <span className="fp-block__label">{tableRef.publicNumber}</span>
            {tableRef.capacity != null && (
              <span className="fp-block__capacity">{tableRef.capacity}P</span>
            )}
          </>
        )}
      </button>
    )
  }

  if (e.type === "obstacle") {
    return <div key={e.id} className="fp-block fp-block--obstacle" style={style} />
  }

  if (e.type === "threshold") {
    return (
      <div key={e.id} className="fp-block fp-block--threshold" style={style}>
        <span className="fp-block__zone-label">{e.label ?? ""}</span>
      </div>
    )
  }

  // portal — a link to another zone when it has a target and a navigate handler
  const canNavigate = Boolean(opts.onPortalNavigate && e.targetZoneId)
  if (canNavigate) {
    return (
      <button
        key={e.id}
        type="button"
        className="fp-block fp-block--portal fp-block--portal-link"
        style={style}
        onClick={() => opts.onPortalNavigate?.(e.targetZoneId as string)}
      >
        <span className="fp-block__portal-arrow" aria-hidden>
          →
        </span>
        <span className="fp-block__zone-label">{e.label ?? "Portal"}</span>
      </button>
    )
  }
  return (
    <div key={e.id} className="fp-block fp-block--portal" style={style}>
      <span className="fp-block__zone-label">{e.label ?? "Portal"}</span>
    </div>
  )
}
