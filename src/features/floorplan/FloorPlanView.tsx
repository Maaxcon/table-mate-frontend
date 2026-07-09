import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
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

export interface FloorPlanViewProps {
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
  /**
   * Full per-entity override. When provided, replaces the default fp-block
   * rendering — including the canvas edge lines — for every entity (tables,
   * obstacles, thresholds, portals alike). Geometry is raw numbers, not a
   * prebuilt style/transform, so the consumer can apply rotation however it
   * wants (e.g. a --rot custom property + CSS rule instead of an inline
   * transform). tableStatus/renderTableContent/onTableSelect/onPortalNavigate
   * are ignored when this is set — the override owns everything.
   */
  renderEntity?: (
    entity: EditorEntity,
    geometry: { left: number; top: number; width: number; height: number; rotation: number },
    ctx: { selected: boolean; index: number },
  ) => ReactNode
  /**
   * Fit/center on this sub-rectangle instead of the whole canvas (GRID units,
   * same space as canvasCols/canvasRows). Entities keep their normal
   * canvas-relative positions; only the fitted/visible region shifts.
   * Omitting it is exactly the {x:0,y:0,width:canvasCols,height:canvasRows}
   * case — no behavior change for callers that don't pass it.
   */
  frame?: { x: number; y: number; width: number; height: number }
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
function FloorPlanViewImpl({
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
  renderEntity: renderEntityProp,
  frame,
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
  // The sub-rectangle to fit/center on — defaults to the whole canvas, so
  // omitting `frame` reduces every formula below to today's behavior exactly.
  const framePxX = (frame?.x ?? 0) * GRID
  const framePxY = (frame?.y ?? 0) * GRID
  const framePxW = (frame?.width ?? canvasCols) * GRID
  const framePxH = (frame?.height ?? canvasRows) * GRID
  const { scale, width: containerWidth, height: containerHeight } = viewBox
  const aspectRatio = framePxH === 0 ? 1 : framePxW / framePxH
  const containerStyle = useMemo<CSSProperties>(
    () => ({ aspectRatio: `${aspectRatio}` }),
    [aspectRatio],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Fit the frame plus its proportional overhang (one grid cell each side, where
    // grid -1 portals/thresholds live). With padding = GRID * scale the scale factors
    // out cleanly: clientWidth = (framePxW + 2 * GRID) * scale.
    const minScale = minScaleProp ?? 0.3
    const maxScale = maxScaleProp ?? Number.POSITIVE_INFINITY
    const update = () => {
      const availableW = el.clientWidth
      const availableH = el.clientHeight
      // The container's own height is aspect-ratio-derived (from its width),
      // not fixed by an ancestor — nested inside a shrink-to-fit chain (as on
      // the customer floor), the very first layout pass can briefly report
      // clientHeight=0 before that resolves. Falling back to availableW
      // (assuming a square) commits a too-small fit for a wide room and
      // clips tables until something else happens to trigger a re-render.
      // Skip and wait for the next callback instead — ResizeObserver keeps
      // firing until the box has a real, non-zero size.
      if (availableW === 0 || availableH === 0) return
      const neededW = framePxW + 2 * GRID
      const neededH = framePxH + 2 * GRID
      const fitted = Math.min(availableW / neededW, availableH / neededH)
      const scale = Math.min(maxScale, Math.max(fitted, minScale))
      setViewBox({ scale, width: availableW, height: availableH })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [framePxW, framePxH, minScaleProp, maxScaleProp])

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

  // Computed once per `visible` change, not on every render — otherwise a
  // renderEntity override's props would get a fresh geometry object every
  // time (e.g. a selectedId change elsewhere), defeating React.memo on
  // whatever the consumer renders per entity.
  const geometries = useMemo(
    () =>
      visible.map((e) => ({
        left: px(e.x),
        top: px(e.y),
        width: px(e.w),
        height: px(e.h),
        rotation: e.rotation ?? 0,
      })),
    [visible],
  )

  if (!payload || entities.length === 0) {
    return (
      <div className="fp-view fp-view--empty" ref={containerRef}>
        <p className="fp-view__empty-text">{emptyMessage}</p>
      </div>
    )
  }

  const pad = GRID * scale
  const scaledW = framePxW * scale + 2 * pad
  const scaledH = framePxH * scale + 2 * pad
  const offsetX = Math.max((containerWidth - scaledW) / 2, 0)
  const offsetY = Math.max((containerHeight - scaledH) / 2, 0)

  return (
    <div className="fp-view" ref={containerRef} style={containerStyle}>
      {/* Absolutely positioned (not a normal-flow flex item) so its JS-computed
          scaledW/H can never feed back into this container's own measured
          size — it used to be a normal-flow child, which meant a larger
          `scale` (computed FROM this element's height) produced a taller
          spacer, which grew this element's height, which the next
          ResizeObserver tick read back in as `containerHeight`: a circular
          fit->size->fit loop that settled on a scale too large for the room,
          clipping tables until an unrelated resize (e.g. clicking a table)
          happened to jog it back to a smaller, correct value. */}
      <div
        style={{
          position: "absolute",
          top: offsetY,
          left: offsetX,
          width: scaledW,
          height: scaledH,
          pointerEvents: "none",
          visibility: "hidden",
        }}
      />
      <div
        className="fp-view__stage"
        style={{
          position: "absolute",
          // The stage stays sized to the FULL canvas (entities keep their
          // normal canvas-relative positions) — only its screen offset shifts
          // to bring the frame's top-left into view. With frame omitted,
          // framePxX/Y are 0, so this is identical to the old pad+offset math.
          top: pad + offsetY - framePxY * scale,
          left: pad + offsetX - framePxX * scale,
          width: canvasPxW,
          height: canvasPxH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {visible.map((e, index) => {
          if (renderEntityProp) {
            const geometry = geometries[index]
            const id = e.serverId ?? e.id
            const selected = selectedId != null && selectedId === id
            return renderEntityProp(e, geometry, { selected, index })
          }
          return defaultRenderEntity(e, {
            selectedId,
            onTableSelect,
            tableStatus,
            renderTableContent,
            onPortalNavigate,
          })
        })}
        {!renderEntityProp && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}

// Memoized so a re-render triggered elsewhere in a consumer's tree (e.g. a
// hover-only state update) skips this whole subtree — and therefore every
// per-entity render — as long as none of these props actually changed.
export const FloorPlanView = memo(FloorPlanViewImpl)

interface RenderOpts {
  selectedId: string | null
  onTableSelect?: (table: FloorPlanTableRef) => void
  tableStatus?: (table: FloorPlanTableRef) => FloorVisualStatus
  renderTableContent?: (table: FloorPlanTableRef) => ReactNode
  onPortalNavigate?: (targetZoneId: string) => void
}

function defaultRenderEntity(e: EditorEntity, opts: RenderOpts): ReactNode {
  const style = {
    left: px(e.x),
    top: px(e.y),
    width: px(e.w),
    height: px(e.h),
    transform: e.rotation ? `rotate(${e.rotation}deg)` : undefined,
    borderRadius: e.type === "table-round" ? "50%" : undefined,
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
