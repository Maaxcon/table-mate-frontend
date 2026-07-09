import {
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

export interface FloorPlanTableRef {
  id: string
  publicNumber: string
  capacity: number | null
}

interface FloorPlanViewProps {
  payload: LayoutPayload | null | undefined
  selectedZoneId?: string | null
  selectedId?: string | null
  edgeStyles?: Record<string, "dashed" | "solid">
  canvasCols?: number
  canvasRows?: number
  onTableSelect?: (table: FloorPlanTableRef) => void
  tableStatus?: (table: FloorPlanTableRef) => FloorVisualStatus
  renderTableContent?: (table: FloorPlanTableRef) => ReactNode
  onPortalNavigate?: (targetZoneId: string) => void
  emptyMessage?: string
  minScale?: number
  maxScale?: number
  enableZoom?: boolean
  enablePan?: boolean
}

const px = (v: number) => v * GRID

/**
 * Read-only renderer that draws a published floor layout exactly as the admin
 * editor does: every entity at its real position/size/shape, plus obstacles,
 * thresholds and portals — uniformly scaled to fit the container. Shared by the
 * customer and waiter floor views so all three stay visually identical.
 */
const MIN_ZOOM = 0.3
const MAX_ZOOM = 4

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
  enableZoom = false,
  enablePan = false,
}: FloorPlanViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewBox, setViewBox] = useState({ scale: 1, width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null)
  const zoomRef = useRef(zoom)
  const panOffsetRef = useRef(panOffset)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  useEffect(() => {
    panOffsetRef.current = panOffset
  }, [panOffset])

  const clampZoom = useCallback((z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)), [])

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

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enableZoom) return
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom((z) => clampZoom(z * (1 - e.deltaY * 0.01)))
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
            offsetX: panOffsetRef.current.x,
            offsetY: panOffsetRef.current.y,
          }
        } else {
          const dx = e.touches[0].clientX - panStart.current.x
          const dy = e.touches[0].clientY - panStart.current.y
          setPanOffset({
            x: panStart.current.offsetX + dx,
            y: panStart.current.offsetY + dy,
          })
        }
      }
    },
    [enableZoom, enablePan, clampZoom],
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
        offsetX: panOffsetRef.current.x,
        offsetY: panOffsetRef.current.y,
      }
      e.preventDefault()
    }
    el.addEventListener("mousedown", onMouseDown)
    return () => el.removeEventListener("mousedown", onMouseDown)
  }, [enablePan])

  useEffect(() => {
    if (!enablePan) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setPanOffset({
        x: panStart.current.offsetX + dx,
        y: panStart.current.offsetY + dy,
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
  }, [enablePan])

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

  const totalScale = scale * zoom
  const pad = GRID * totalScale
  const scaledW = canvasPxW * totalScale + 2 * pad
  const scaledH = canvasPxH * totalScale + 2 * pad
  const offsetX = Math.max((containerWidth - scaledW) / 2, 0)
  const offsetY = Math.max((containerHeight - scaledH) / 2, 0)

  if (!payload || entities.length === 0) {
    return (
      <div className="fp-view fp-view--empty" ref={containerRef}>
        <p className="fp-view__empty-text">{emptyMessage}</p>
      </div>
    )
  }

  const stageStyle: CSSProperties = {
    position: "absolute",
    top: pad + offsetY + panOffset.y,
    left: pad + offsetX + panOffset.x,
    width: canvasPxW,
    height: canvasPxH,
    transform: `scale(${totalScale})`,
    transformOrigin: "top left",
  }

  const containerClass = ["fp-view", enablePan ? "fp-view--pan-enabled" : ""]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClass} ref={containerRef} style={containerStyle}>
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
      <div className="fp-view__stage" style={stageStyle}>
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
