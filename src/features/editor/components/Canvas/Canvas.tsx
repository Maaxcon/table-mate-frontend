import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { snap, GRID, EDITOR_MIN_SCALE, EDITOR_MAX_SCALE } from "@/features/editor/types"
import type { EditorEntity } from "@/features/editor/types"
import { TableBlock } from "./entities/TableBlock"
import { ObstacleBlock } from "./entities/ObstacleBlock"
import { ThresholdBlock } from "./entities/ThresholdBlock"
import { PortalBlock } from "./entities/PortalBlock"
import "./Canvas.css"

const clampScale = (s: number) => Math.min(EDITOR_MAX_SCALE, Math.max(EDITOR_MIN_SCALE, s))
const SNAP_THRESHOLD = 0.4

interface CanvasProps {
  entities: EditorEntity[]
  selectedId: string | null
  selectedIds: string[]
  activeTool: string | null
  onEntityMove: (id: string, x: number, y: number) => void
  onEntitiesMoveByDelta: (ids: string[], dx: number, dy: number) => void
  onSelectionChange: (ids: string[], primaryId: string | null) => void
  onCanvasClick: (gridX: number, gridY: number) => void
  onEntityResize: (id: string, w: number, h: number) => void
  edgeStyles: Record<string, "dashed" | "solid">
  canvasCols: number
  canvasRows: number
}

type MarqueeRect = {
  x: number
  y: number
  w: number
  h: number
}

type LogicalPoint = {
  x: number
  y: number
}

type SnapGuide = {
  axis: "x" | "y"
  position: number
}

type RectBounds = {
  x: number
  y: number
  w: number
  h: number
}

type ZoomAnchor = {
  worldX: number
  worldY: number
}

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

const normalizeRect = (a: LogicalPoint, b: LogicalPoint): MarqueeRect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
})

const rectsIntersect = (a: MarqueeRect, b: MarqueeRect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

const getAxisRefs = (start: number, size: number): number[] => [
  start,
  start + size / 2,
  start + size,
]

function resolveSnapRect(
  moving: RectBounds,
  others: RectBounds[],
): { x: number; y: number; guides: SnapGuide[] } {
  const movingXRefs = getAxisRefs(moving.x, moving.w)
  const movingYRefs = getAxisRefs(moving.y, moving.h)
  let bestXDelta: number | null = null
  let bestYDelta: number | null = null
  let bestXGuide: number | null = null
  let bestYGuide: number | null = null

  for (const other of others) {
    const otherXRefs = getAxisRefs(other.x, other.w)
    const otherYRefs = getAxisRefs(other.y, other.h)

    for (const refX of movingXRefs) {
      for (const guideX of otherXRefs) {
        const delta = guideX - refX
        if (Math.abs(delta) > SNAP_THRESHOLD) continue
        if (bestXDelta === null || Math.abs(delta) < Math.abs(bestXDelta)) {
          bestXDelta = delta
          bestXGuide = guideX
        }
      }
    }

    for (const refY of movingYRefs) {
      for (const guideY of otherYRefs) {
        const delta = guideY - refY
        if (Math.abs(delta) > SNAP_THRESHOLD) continue
        if (bestYDelta === null || Math.abs(delta) < Math.abs(bestYDelta)) {
          bestYDelta = delta
          bestYGuide = guideY
        }
      }
    }
  }

  const x = moving.x + (bestXDelta ?? 0)
  const y = moving.y + (bestYDelta ?? 0)
  const guides: SnapGuide[] = []
  if (bestXGuide !== null) guides.push({ axis: "x", position: bestXGuide })
  if (bestYGuide !== null) guides.push({ axis: "y", position: bestYGuide })
  return { x, y, guides }
}

const getTouchDistance = (touches: TouchList) =>
  Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

const getTouchMidpoint = (touches: TouchList) => ({
  clientX: (touches[0].clientX + touches[1].clientX) / 2,
  clientY: (touches[0].clientY + touches[1].clientY) / 2,
})

export function Canvas({
  entities,
  selectedId,
  selectedIds,
  activeTool,
  onEntityMove,
  onEntitiesMoveByDelta,
  onSelectionChange,
  onCanvasClick,
  onEntityResize,
  edgeStyles,
  canvasCols,
  canvasRows,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    entityIds: string[]
    primaryId: string
    startMouseX: number
    startMouseY: number
    startPrimaryX: number
    startPrimaryY: number
    appliedDeltaX: number
    appliedDeltaY: number
    moved: boolean
  } | null>(null)
  const marqueeRef = useRef<{ start: LogicalPoint } | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])

  const panDragRef = useRef<{
    startX: number
    startY: number
    startScrollLeft: number
    startScrollTop: number
  } | null>(null)

  const [scale, setScale] = useState(1)
  // Mirror scale into a ref so the (once-bound) gesture listeners read the live
  // value without re-subscribing on every zoom step.
  const scaleRef = useRef(scale)
  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  const userAdjustedZoomRef = useRef(false)

  const centerCanvasInView = useCallback(
    (nextScale: number) => {
      const container = containerRef.current
      if (!container) return
      const visualWidth = canvasCols * GRID * nextScale
      const visualHeight = canvasRows * GRID * nextScale
      container.scrollLeft = Math.max(0, (visualWidth - container.clientWidth) / 2)
      container.scrollTop = Math.max(0, (visualHeight - container.clientHeight) / 2)
    },
    [canvasCols, canvasRows],
  )

  const computeFitScale = useCallback(() => {
    const container = containerRef.current
    if (!container) return 1
    const w = canvasCols * GRID
    const h = canvasRows * GRID
    const styles = window.getComputedStyle(container)
    const horizontalPadding =
      parseFloat(styles.paddingLeft || "0") + parseFloat(styles.paddingRight || "0")
    const verticalPadding =
      parseFloat(styles.paddingTop || "0") + parseFloat(styles.paddingBottom || "0")
    const availableWidth = Math.max(1, container.clientWidth - horizontalPadding)
    const availableHeight = Math.max(1, container.clientHeight - verticalPadding)
    return clampScale(Math.min(availableWidth / w, availableHeight / h))
  }, [canvasCols, canvasRows])

  const fitCanvasToViewport = useCallback(() => {
    const nextScale = computeFitScale()
    setScale(nextScale)
    requestAnimationFrame(() => {
      centerCanvasInView(nextScale)
    })
  }, [centerCanvasInView, computeFitScale])

  // Fit current zone on mount/resize while user hasn't manually changed zoom.
  // ResizeObserver handles viewport changes and panel resizes without forcing
  // synchronous setState in an effect body.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    userAdjustedZoomRef.current = false
    const rafId = requestAnimationFrame(() => {
      if (!userAdjustedZoomRef.current) fitCanvasToViewport()
    })

    const observer = new ResizeObserver(() => {
      if (!userAdjustedZoomRef.current) fitCanvasToViewport()
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [canvasCols, canvasRows, fitCanvasToViewport])

  // Pinch (two-finger) and ctrl+wheel zoom of the canvas. Native non-passive
  // listeners so we can preventDefault the browser's own page zoom/scroll.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let pinchStart: { dist: number; scale: number; anchor: ZoomAnchor } | null = null

    const getAnchor = (clientX: number, clientY: number, baseScale: number): ZoomAnchor => {
      const rect = el.getBoundingClientRect()
      const localX = clientX - rect.left
      const localY = clientY - rect.top
      return {
        worldX: (el.scrollLeft + localX) / baseScale,
        worldY: (el.scrollTop + localY) / baseScale,
      }
    }

    const zoomTo = (nextScale: number, clientX: number, clientY: number, anchor: ZoomAnchor) => {
      const rect = el.getBoundingClientRect()
      const localX = clientX - rect.left
      const localY = clientY - rect.top
      userAdjustedZoomRef.current = true
      setScale(nextScale)
      requestAnimationFrame(() => {
        el.scrollLeft = anchor.worldX * nextScale - localX
        el.scrollTop = anchor.worldY * nextScale - localY
      })
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const midpoint = getTouchMidpoint(e.touches)
        pinchStart = {
          dist: getTouchDistance(e.touches),
          scale: scaleRef.current,
          anchor: getAnchor(midpoint.clientX, midpoint.clientY, scaleRef.current),
        }
        e.preventDefault()
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (pinchStart && e.touches.length === 2) {
        e.preventDefault()
        const d = getTouchDistance(e.touches)
        if (pinchStart.dist === 0 || d === 0) return
        const midpoint = getTouchMidpoint(e.touches)
        const nextScale = clampScale(pinchStart.scale * (d / pinchStart.dist))
        zoomTo(nextScale, midpoint.clientX, midpoint.clientY, pinchStart.anchor)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStart = null
    }

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return // trackpad pinch surfaces as ctrl+wheel
      e.preventDefault()
      const currentScale = scaleRef.current
      const nextScale = clampScale(currentScale * (1 - e.deltaY * 0.01))
      const anchor = getAnchor(e.clientX, e.clientY, currentScale)
      zoomTo(nextScale, e.clientX, e.clientY, anchor)
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("wheel", onWheel)
    }
  }, [])

  const entitiesById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities],
  )
  const activeSelectionIds = useMemo(
    () => (selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : []),
    [selectedIds, selectedId],
  )
  const selectedSet = useMemo(() => new Set(activeSelectionIds), [activeSelectionIds])

  const getLogicalPointFromMouse = useCallback(
    (clientX: number, clientY: number): LogicalPoint | null => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return null
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
    },
    [scale],
  )

  const toggleSelection = useCallback(
    (id: string) => {
      const alreadySelected = selectedSet.has(id)
      if (alreadySelected) {
        const nextIds = activeSelectionIds.filter((selected) => selected !== id)
        onSelectionChange(nextIds, nextIds[0] ?? null)
      } else {
        onSelectionChange([...activeSelectionIds, id], id)
      }
    },
    [activeSelectionIds, onSelectionChange, selectedSet],
  )

  const selectSingle = useCallback(
    (id: string) => {
      onSelectionChange([id], id)
    },
    [onSelectionChange],
  )

  const onBlockMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (e.button !== 0) return
      if (activeTool && activeTool !== "select" && activeTool !== "pan") return
      e.preventDefault()
      e.stopPropagation()

      const withModifier = e.metaKey || e.ctrlKey || e.shiftKey
      if (withModifier) {
        toggleSelection(id)
        return
      }

      const dragIds =
        selectedSet.has(id) && activeSelectionIds.length > 0 ? activeSelectionIds : [id]
      const primaryEntity = entitiesById.get(id)
      if (!primaryEntity) return
      onSelectionChange(dragIds, id)

      dragRef.current = {
        entityIds: dragIds,
        primaryId: id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPrimaryX: primaryEntity.x,
        startPrimaryY: primaryEntity.y,
        appliedDeltaX: 0,
        appliedDeltaY: 0,
        moved: false,
      }
    },
    [activeSelectionIds, activeTool, entitiesById, onSelectionChange, selectedSet, toggleSelection],
  )

  const handleBlockClick = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
      if (e.type !== "keydown") return
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        toggleSelection(id)
        return
      }
      selectSingle(id)
    },
    [selectSingle, toggleSelection],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pan = panDragRef.current
      if (pan) {
        if (snapGuides.length > 0) setSnapGuides([])
        const el = containerRef.current
        if (!el) return
        el.scrollLeft = pan.startScrollLeft - (e.clientX - pan.startX)
        el.scrollTop = pan.startScrollTop - (e.clientY - pan.startY)
        return
      }
      const marquee = marqueeRef.current
      if (marquee) {
        if (snapGuides.length > 0) setSnapGuides([])
        const point = getLogicalPointFromMouse(e.clientX, e.clientY)
        if (!point) return
        setMarqueeRect(normalizeRect(marquee.start, point))
        return
      }

      const drag = dragRef.current
      if (!drag) return

      const dx = e.clientX - drag.startMouseX
      const dy = e.clientY - drag.startMouseY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        drag.moved = true
      }

      const logicalDx = dx / scale
      const logicalDy = dy / scale
      const rawX = snap(drag.startPrimaryX * GRID + logicalDx) / GRID
      const rawY = snap(drag.startPrimaryY * GRID + logicalDy) / GRID
      const primaryEntity = entitiesById.get(drag.primaryId)
      if (!primaryEntity) return
      const snapCandidates = entities
        .filter((entity) => !drag.entityIds.includes(entity.id))
        .map((entity) => ({ x: entity.x, y: entity.y, w: entity.w, h: entity.h }))
      const snapped = resolveSnapRect(
        { x: rawX, y: rawY, w: primaryEntity.w, h: primaryEntity.h },
        snapCandidates,
      )
      if (snapped.guides.length > 0) {
        setSnapGuides(snapped.guides)
      } else if (snapGuides.length > 0) {
        setSnapGuides([])
      }
      const newX = snapped.x
      const newY = snapped.y
      if (drag.entityIds.length <= 1) {
        onEntityMove(drag.primaryId, newX, newY)
        return
      }
      const deltaX = newX - drag.startPrimaryX
      const deltaY = newY - drag.startPrimaryY
      const stepX = deltaX - drag.appliedDeltaX
      const stepY = deltaY - drag.appliedDeltaY
      if (stepX === 0 && stepY === 0) return
      drag.appliedDeltaX = deltaX
      drag.appliedDeltaY = deltaY
      onEntitiesMoveByDelta(drag.entityIds, stepX, stepY)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (panDragRef.current) {
        panDragRef.current = null
        if (containerRef.current) containerRef.current.style.cursor = ""
      }
      if (marqueeRef.current) {
        const point = getLogicalPointFromMouse(e.clientX, e.clientY)
        const start = marqueeRef.current.start
        marqueeRef.current = null
        if (point) {
          const selection = normalizeRect(start, point)
          if (selection.w < 6 && selection.h < 6) {
            onSelectionChange([], null)
          } else {
            const selectedEntityIds = entities
              .filter((entity) =>
                rectsIntersect(selection, {
                  x: entity.x * GRID,
                  y: entity.y * GRID,
                  w: entity.w * GRID,
                  h: entity.h * GRID,
                }),
              )
              .map((entity) => entity.id)
            onSelectionChange(selectedEntityIds, selectedEntityIds[0] ?? null)
          }
        }
        setMarqueeRect(null)
      }
      if (snapGuides.length > 0) setSnapGuides([])
      dragRef.current = null
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    entities,
    entitiesById,
    getLogicalPointFromMouse,
    onEntitiesMoveByDelta,
    onEntityMove,
    onSelectionChange,
    scale,
    snapGuides.length,
  ])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (isTextInputTarget(e.target)) return

      const hadTransientDragState =
        marqueeRef.current !== null || dragRef.current !== null || panDragRef.current !== null
      if (!hadTransientDragState && !marqueeRect && snapGuides.length === 0) return

      e.preventDefault()
      marqueeRef.current = null
      dragRef.current = null
      panDragRef.current = null
      setMarqueeRect(null)
      if (snapGuides.length > 0) setSnapGuides([])
      if (containerRef.current) {
        containerRef.current.style.cursor = ""
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [marqueeRect, snapGuides.length])

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest(".editor-block")) return

      if (activeTool && activeTool !== "select" && activeTool !== "pan") {
        if (snapGuides.length > 0) setSnapGuides([])
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const logicalX = (e.clientX - rect.left) / scale
        const logicalY = (e.clientY - rect.top) / scale
        const gridX = snap(logicalX) / GRID
        const gridY = snap(logicalY) / GRID
        onCanvasClick(gridX, gridY)
      } else {
        if (snapGuides.length > 0) setSnapGuides([])
        const start = getLogicalPointFromMouse(e.clientX, e.clientY)
        if (!start) return
        marqueeRef.current = { start }
        setMarqueeRect({ x: start.x, y: start.y, w: 0, h: 0 })
      }
    },
    [activeTool, getLogicalPointFromMouse, onCanvasClick, scale, snapGuides.length],
  )

  const renderBlock = (entity: EditorEntity) => {
    const selected = selectedSet.has(entity.id)
    const allowResize = selected && selectedId === entity.id && activeSelectionIds.length === 1
    const props = {
      entity,
      selected,
      onMouseDown: onBlockMouseDown,
      onClick: handleBlockClick,
      onResize: allowResize ? onEntityResize : undefined,
      onMove: allowResize ? onEntityMove : undefined,
      canvasScale: scale,
      canvasCols,
      canvasRows,
    }

    switch (entity.type) {
      case "table-square":
      case "table-round":
        return <TableBlock key={entity.id} {...props} />
      case "obstacle":
        return <ObstacleBlock key={entity.id} {...props} />
      case "threshold":
        return <ThresholdBlock key={entity.id} {...props} />
      case "portal":
        return <PortalBlock key={entity.id} {...props} />
    }
  }

  // Keyboard editing for the selected entity: arrows move by one grid cell,
  // Shift+arrows resize. The reducer clamps both, so this stays on-canvas.
  useEffect(() => {
    if (activeSelectionIds.length === 0) return
    const ARROWS: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      // Don't hijack arrow keys while typing in the properties sidebar.
      if (isTextInputTarget(target)) return
      const delta = ARROWS[e.key]
      if (!delta) return
      e.preventDefault()
      const [dx, dy] = delta
      if (activeSelectionIds.length === 1) {
        const entity = entities.find((en) => en.id === activeSelectionIds[0])
        if (!entity) return
        if (e.shiftKey) {
          onEntityResize(entity.id, entity.w + dx, entity.h + dy)
        } else {
          onEntityMove(entity.id, entity.x + dx, entity.y + dy)
        }
        return
      }
      if (e.shiftKey) return
      onEntitiesMoveByDelta(activeSelectionIds, dx, dy)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeSelectionIds, entities, onEntitiesMoveByDelta, onEntityMove, onEntityResize])

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
    }
    el.style.cursor = "grabbing"
  }, [])

  useEffect(() => {
    if (activeTool && activeTool !== "select" && activeTool !== "pan") {
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "crosshair"
      }
    } else {
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "default"
      }
    }
  }, [activeTool])

  const canvasStyle = useMemo(
    () => ({
      width: canvasCols * GRID,
      height: canvasRows * GRID,
      ["--grid-size" as const]: `${GRID}px`,
    }),
    [canvasCols, canvasRows],
  )

  const contentStyle = useMemo(
    () => ({
      width: canvasCols * GRID,
      height: canvasRows * GRID,
      transformOrigin: "0 0",
      transform: `scale(${scale})`,
    }),
    [canvasCols, canvasRows, scale],
  )

  return (
    <div
      ref={containerRef}
      className="editor-canvas__container"
      onMouseDown={handleContainerMouseDown}
      role="presentation"
    >
      {/* The wrapper is sized to the visual canvas extent so the scrollport
          matches what the user sees, avoiding dead scroll space when zoomed out. */}
      <div style={{ width: canvasCols * GRID * scale, height: canvasRows * GRID * scale }}>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={canvasRef}
          className="editor-canvas"
          style={canvasStyle}
          onMouseDown={handleCanvasMouseDown}
          role="application"
          aria-label="Floor plan editor"
        >
          <div className="editor-canvas__content" style={contentStyle}>
            {snapGuides.map((guide, index) => (
              <div
                key={`${guide.axis}-${guide.position}-${index}`}
                className={`editor-canvas__snap-line editor-canvas__snap-line--${guide.axis === "x" ? "vertical" : "horizontal"}`}
                style={
                  guide.axis === "x"
                    ? { left: guide.position * GRID }
                    : { top: guide.position * GRID }
                }
              />
            ))}
            {entities.map(renderBlock)}
            {marqueeRect && (
              <div
                className="editor-canvas__marquee"
                style={{
                  left: marqueeRect.x,
                  top: marqueeRect.y,
                  width: marqueeRect.w,
                  height: marqueeRect.h,
                }}
              />
            )}
            <div
              className={`editor-canvas__edge editor-canvas__edge--top${edgeStyles.top === "solid" ? " editor-canvas__edge--solid" : ""}`}
            />
            <div
              className={`editor-canvas__edge editor-canvas__edge--right${edgeStyles.right === "solid" ? " editor-canvas__edge--solid" : ""}`}
            />
            <div
              className={`editor-canvas__edge editor-canvas__edge--bottom${edgeStyles.bottom === "solid" ? " editor-canvas__edge--solid" : ""}`}
            />
            <div
              className={`editor-canvas__edge editor-canvas__edge--left${edgeStyles.left === "solid" ? " editor-canvas__edge--solid" : ""}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
