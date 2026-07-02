import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import {
  DEFAULT_CANVAS_COLS,
  DEFAULT_CANVAS_ROWS,
  GRID,
  deserializeLayout,
  uprightContentStyle,
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
  /** Per-zone edge styles override (computed externally from zone data). */
  edgeStyles?: Record<string, "dashed" | "solid">
  /** Per-zone canvas dimensions in grid units. Falls back to defaults. */
  canvasCols?: number
  canvasRows?: number
  onTableSelect?: (table: FloorPlanTableRef) => void
  /** Resolve a table's visual status (defaults to "free"). */
  tableStatus?: (table: FloorPlanTableRef) => FloorVisualStatus
  /** Extra content rendered inside a table (badges, guest info, timers, ...). */
  renderTableContent?: (table: FloorPlanTableRef) => ReactNode
  /** Navigate to a portal's target zone on click (makes portals interactive links). */
  onPortalNavigate?: (targetZoneId: string) => void
  /** Shown when there is no published layout to render. */
  emptyMessage?: string
  /** Clamp auto-fit scale (default min 0.3, no max). */
  minScale?: number
  maxScale?: number
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
  edgeStyles: edgeStylesProp,
  canvasCols: canvasColsProp,
  canvasRows: canvasRowsProp,
  onTableSelect,
  tableStatus,
  renderTableContent,
  onPortalNavigate,
  emptyMessage = "No floor plan published yet.",
  minScale: minScaleProp,
  maxScale: maxScaleProp,
}: FloorPlanViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewBox, setViewBox] = useState({ scale: 1, width: 0, height: 0 })

  const canvasCols = canvasColsProp ?? DEFAULT_CANVAS_COLS
  const canvasRows = canvasRowsProp ?? DEFAULT_CANVAS_ROWS
  const canvasPxW = canvasCols * GRID
  const canvasPxH = canvasRows * GRID
  const { scale, width: containerWidth, height: containerHeight } = viewBox
  const aspectRatio = canvasPxH === 0 ? 1 : canvasPxW / canvasPxH
  const containerStyle = useMemo<CSSProperties>(
    () => ({ aspectRatio: `${aspectRatio}` }),
    [aspectRatio],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Fit the canvas plus its proportional overhang (one grid cell each side, where
    // grid -1 portals/thresholds live). With padding = GRID * scale the scale factors
    // out cleanly: clientWidth = (canvasPxW + 2 * GRID) * scale.
    const minScale = minScaleProp ?? 0.3
    const maxScale = maxScaleProp ?? Number.POSITIVE_INFINITY
    const update = () => {
      const availableW = el.clientWidth
      const availableH = el.clientHeight || availableW
      const neededW = canvasPxW + 2 * GRID
      const neededH = canvasPxH + 2 * GRID
      const fitted = Math.min(availableW / neededW, availableH / neededH)
      const scale = Math.min(maxScale, Math.max(fitted, minScale))
      setViewBox({ scale, width: availableW, height: availableH })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [canvasPxW, canvasPxH, minScaleProp, maxScaleProp])

  const entities = useMemo<EditorEntity[]>(
    () => (payload ? deserializeLayout(payload) : []),
    [payload],
  )

  const edgeStyles = useMemo(
    () =>
      edgeStylesProp ??
      payload?.edge_styles ?? { top: "dashed", right: "dashed", bottom: "dashed", left: "dashed" },
    [edgeStylesProp, payload],
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

  const pad = GRID * scale
  const scaledW = canvasPxW * scale + 2 * pad
  const scaledH = canvasPxH * scale + 2 * pad
  const offsetX = Math.max((containerWidth - scaledW) / 2, 0)
  const offsetY = Math.max((containerHeight - scaledH) / 2, 0)

  return (
    <div className="fp-view" ref={containerRef} style={containerStyle}>
      <div
        style={{
          width: scaledW,
          height: scaledH,
          marginLeft: offsetX,
          marginRight: offsetX,
          marginTop: offsetY,
          marginBottom: offsetY,
          flexShrink: 0,
          pointerEvents: "none",
          visibility: "hidden",
        }}
      />
      <div
        className="fp-view__stage"
        style={{
          position: "absolute",
          top: pad + offsetY,
          left: pad + offsetX,
          width: canvasPxW,
          height: canvasPxH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
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
        <div
          className={`fp-view__edge fp-view__edge--top${edgeStyles.top === "solid" ? " fp-view__edge--solid" : ""}`}
        />
        <div
          className={`fp-view__edge fp-view__edge--right${edgeStyles.right === "solid" ? " fp-view__edge--solid" : ""}`}
        />
        <div
          className={`fp-view__edge fp-view__edge--bottom${edgeStyles.bottom === "solid" ? " fp-view__edge--solid" : ""}`}
        />
        <div
          className={`fp-view__edge fp-view__edge--left${edgeStyles.left === "solid" ? " fp-view__edge--solid" : ""}`}
        />
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
  const style = {
    left: px(e.x),
    top: px(e.y),
    width: px(e.w),
    height: px(e.h),
    transform: e.rotation ? `rotate(${e.rotation}deg)` : undefined,
  }

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
        aria-label={`Table ${tableRef.publicNumber || tableRef.id}, ${status}`}
        onClick={opts.onTableSelect ? () => opts.onTableSelect?.(tableRef) : undefined}
      >
        <span style={uprightContentStyle(e.rotation)}>
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
        </span>
      </button>
    )
  }

  if (e.type === "obstacle") {
    return <div key={e.id} className="fp-block fp-block--obstacle" style={style} />
  }

  if (e.type === "threshold") {
    return (
      <div key={e.id} className="fp-block fp-block--threshold" style={style}>
        <span style={uprightContentStyle(e.rotation)}>
          <span className="fp-block__zone-label">{e.label ?? ""}</span>
        </span>
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
        aria-label={`Go to ${e.label ?? "zone"}`}
        onClick={() => opts.onPortalNavigate?.(e.targetZoneId as string)}
      >
        <span className="fp-block__portal-arrow" aria-hidden>
          →
        </span>
        <span style={uprightContentStyle(e.rotation)}>
          <span className="fp-block__zone-label">{e.label ?? "Portal"}</span>
        </span>
      </button>
    )
  }
  return (
    <div key={e.id} className="fp-block fp-block--portal" style={style}>
      <span style={uprightContentStyle(e.rotation)}>
        <span className="fp-block__zone-label">{e.label ?? "Portal"}</span>
      </span>
    </div>
  )
}
