import {
  memo,
  useCallback,
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

/** Identity carried by each layout table, allowing consumers to join with live data. */
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
  /** Full per-entity override — replaces fp-block rendering entirely. */
  renderEntity?: (
    entity: EditorEntity,
    geometry: { left: number; top: number; width: number; height: number; rotation: number },
    ctx: { selected: boolean; index: number },
  ) => ReactNode
  /** Fit/center on this sub-rectangle instead of the whole canvas (GRID units). */
  frame?: { x: number; y: number; width: number; height: number }
  /** Shown when there is no published layout to render. */
  emptyMessage?: string
  /** Clamp auto-fit scale (default min 0.3, unbounded max). */
  minScale?: number
  maxScale?: number
  /** Enable user-driven zoom (wheel/pinch) on top of the auto-fit scale. */
  enableZoom?: boolean
  /** Enable click-drag/touch-drag panning. */
  enablePan?: boolean
}

const px = (v: number) => v * GRID
const MIN_INTERACTIVE_ZOOM = 0.3
const MAX_INTERACTIVE_ZOOM = 4
const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2
const LINE_HEIGHT = 16
const PAGE_HEIGHT = 800
const WHEEL_SENSITIVITY = 0.0015

const normalizeWheelDelta = (event: WheelEvent) => {
  switch (event.deltaMode) {
    case DOM_DELTA_LINE:
      return event.deltaY * LINE_HEIGHT
    case DOM_DELTA_PAGE:
      return event.deltaY * PAGE_HEIGHT
    case DOM_DELTA_PIXEL:
    default:
      return event.deltaY
  }
}

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
  enableZoom = false,
  enablePan = false,
}: FloorPlanViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewBox, setViewBox] = useState({ scale: 1, width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [panRatio, setPanRatio] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null)
  const zoomRef = useRef(zoom)
  const panRatioRef = useRef(panRatio)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRatioRef.current = panRatio
  }, [panRatio])

  useEffect(() => {
    if (!enableZoom) {
      pinchStartRef.current = null
    }
  }, [enableZoom])

  useEffect(() => {
    if (!enablePan) {
      isPanning.current = false
    }
  }, [enablePan])

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_INTERACTIVE_ZOOM, Math.max(MIN_INTERACTIVE_ZOOM, value)),
    [],
  )

  const canvasCols = canvasColsProp ?? DEFAULT_CANVAS_COLS
  const canvasRows = canvasRowsProp ?? DEFAULT_CANVAS_ROWS
  const canvasPxW = canvasCols * GRID
  const canvasPxH = canvasRows * GRID
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

  const viewMetrics = useMemo(() => {
    const interactiveZoom = enableZoom ? zoom : 1
    const totalScale = scale * interactiveZoom
    const pad = GRID * totalScale
    const scaledW = framePxW * totalScale + 2 * pad
    const scaledH = framePxH * totalScale + 2 * pad
    const offsetX = Math.max((containerWidth - scaledW) / 2, 0)
    const offsetY = Math.max((containerHeight - scaledH) / 2, 0)
    const maxPanX = Math.max(0, scaledW - containerWidth)
    const maxPanY = Math.max(0, scaledH - containerHeight)
    return {
      interactiveZoom,
      totalScale,
      pad,
      scaledW,
      scaledH,
      offsetX,
      offsetY,
      maxPanX,
      maxPanY,
    }
  }, [enableZoom, zoom, scale, framePxW, framePxH, containerWidth, containerHeight])

  const { totalScale, pad, scaledW, scaledH, offsetX, offsetY, maxPanX, maxPanY } = viewMetrics

  const clampPanRatio = useCallback(
    (next: { x: number; y: number }) => ({
      x: maxPanX === 0 ? 0 : Math.max(-1, Math.min(1, next.x)),
      y: maxPanY === 0 ? 0 : Math.max(-1, Math.min(1, next.y)),
    }),
    [maxPanX, maxPanY],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const minScale = minScaleProp ?? 0.3
    const maxScale = maxScaleProp ?? Number.POSITIVE_INFINITY
    const update = () => {
      const availableW = el.clientWidth
      const availableH = el.clientHeight
      // When the widget lives inside a display:none parent, ResizeObserver still
      // fires with zeros; bail so we don't thrash scale until the panel is shown.
      if (availableW === 0 || availableH === 0) return
      const neededW = framePxW + 2 * GRID
      const neededH = framePxH + 2 * GRID
      const fitted = Math.min(availableW / neededW, availableH / neededH)
      const nextScale = Math.min(maxScale, Math.max(fitted, minScale))
      setViewBox({ scale: nextScale, width: availableW, height: availableH })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [framePxW, framePxH, minScaleProp, maxScaleProp])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enableZoom) return
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = normalizeWheelDelta(e)
      const multiplier = Math.exp(-delta * WHEEL_SENSITIVITY)
      setZoom((value) => clampZoom(value * multiplier))
    },
    [enableZoom, clampZoom],
  )

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enableZoom && !enablePan) return
      if (e.touches.length === 2 && enableZoom) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        pinchStartRef.current = { dist, zoom: zoomRef.current }
      }
    },
    [enableZoom, enablePan],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enableZoom && !enablePan) return
      if (e.touches.length === 2 && enableZoom) {
        e.preventDefault()
        const pinch = pinchStartRef.current
        if (!pinch || pinch.dist === 0) return
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        setZoom(clampZoom(pinch.zoom * (dist / pinch.dist)))
      } else if (e.touches.length === 1 && enablePan) {
        const target = e.target as HTMLElement
        if (target.closest(".fp-block")) return
        if (!isPanning.current) {
          isPanning.current = true
          panStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            offsetX: panRatioRef.current.x * maxPanX,
            offsetY: panRatioRef.current.y * maxPanY,
          }
        } else {
          const dx = e.touches[0].clientX - panStart.current.x
          const dy = e.touches[0].clientY - panStart.current.y
          setPanRatio((prev) => {
            const nextActualX = panStart.current.offsetX + dx
            const nextActualY = panStart.current.offsetY + dy
            const ratioX = maxPanX === 0 ? 0 : nextActualX / maxPanX
            const ratioY = maxPanY === 0 ? 0 : nextActualY / maxPanY
            const next = clampPanRatio({ x: ratioX, y: ratioY })
            return next.x === prev.x && next.y === prev.y ? prev : next
          })
        }
      }
    },
    [enableZoom, enablePan, clampZoom, clampPanRatio, maxPanX, maxPanY],
  )

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false
    pinchStartRef.current = null
  }, [])

  useEffect(() => {
    if (!enablePan) return
    const el = containerRef.current
    if (!el) return
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest(".fp-block")) return
      isPanning.current = true
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: panRatioRef.current.x * maxPanX,
        offsetY: panRatioRef.current.y * maxPanY,
      }
      e.preventDefault()
    }
    el.addEventListener("mousedown", onMouseDown)
    return () => el.removeEventListener("mousedown", onMouseDown)
  }, [enablePan, maxPanX, maxPanY])

  useEffect(() => {
    if (!enablePan) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setPanRatio((prev) => {
        const nextActualX = panStart.current.offsetX + dx
        const nextActualY = panStart.current.offsetY + dy
        const ratioX = maxPanX === 0 ? 0 : nextActualX / maxPanX
        const ratioY = maxPanY === 0 ? 0 : nextActualY / maxPanY
        const next = clampPanRatio({ x: ratioX, y: ratioY })
        return next.x === prev.x && next.y === prev.y ? prev : next
      })
    }
    const handleMouseUp = () => {
      isPanning.current = false
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [enablePan, clampPanRatio, maxPanX, maxPanY])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener("wheel", handleWheel, { passive: false })
    el.addEventListener("touchstart", handleTouchStart, { passive: true })
    el.addEventListener("touchmove", handleTouchMove, { passive: false })
    el.addEventListener("touchend", handleTouchEnd)
    return () => {
      el.removeEventListener("wheel", handleWheel)
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchmove", handleTouchMove)
      el.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd])

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

  const geometries = useMemo(
    () =>
      visible.map((e) => ({
        left: px(e.x),
        top: px(e.y),
        width: px(e.w),
        height: px(e.h),
        rotation: e.rotation ?? 0,
      })),
    // Rendering each entity touches these coordinates during React reconciliation;
    // keeping the array stable unless the layout changes avoids redundant rerenders
    // inside downstream memoized renderers (see issue #28 notes).
    [visible],
  )

  if (!payload || entities.length === 0) {
    return (
      <div className="fp-view fp-view--empty" ref={containerRef}>
        <p className="fp-view__empty-text">{emptyMessage}</p>
      </div>
    )
  }

  const interactivePan = enablePan
    ? {
        x: panRatio.x * maxPanX,
        y: panRatio.y * maxPanY,
      }
    : { x: 0, y: 0 }

  const containerClass = ["fp-view", enablePan ? "fp-view--pan-enabled" : ""]
    .filter(Boolean)
    .join(" ")

  const stageStyle: CSSProperties = {
    position: "absolute",
    top: pad + offsetY - framePxY * totalScale + interactivePan.y,
    left: pad + offsetX - framePxX * totalScale + interactivePan.x,
    width: canvasPxW,
    height: canvasPxH,
    transform: `scale(${totalScale})`,
    transformOrigin: "top left",
  }

  return (
    <div className={containerClass} ref={containerRef} style={containerStyle}>
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
      {/* Fit→size→fit spacer: mirrors the centered footprint so the observer keeps
          reporting the true viewport even after the stage scales away. */}
      <div className="fp-view__stage" style={stageStyle}>
        {visible.map((entity, index) => {
          if (renderEntityProp) {
            const geometry = geometries[index]
            const id = entity.serverId ?? entity.id
            const selected = selectedId != null && selectedId === id
            return renderEntityProp(entity, geometry, { selected, index })
          }
          return defaultRenderEntity(entity, {
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

// Memoized so consumers can skip re-rendering large floor plans unless props change.
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
