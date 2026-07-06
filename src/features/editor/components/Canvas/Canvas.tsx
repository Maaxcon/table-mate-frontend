import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { snap, GRID, EDITOR_MIN_SCALE, EDITOR_MAX_SCALE } from "@/features/editor/types"
import type { EditorEntity } from "@/features/editor/types"
import { TableBlock } from "./entities/TableBlock"
import { ObstacleBlock } from "./entities/ObstacleBlock"
import { ThresholdBlock } from "./entities/ThresholdBlock"
import { PortalBlock } from "./entities/PortalBlock"
import "./Canvas.css"

const clampScale = (s: number) => Math.min(EDITOR_MAX_SCALE, Math.max(EDITOR_MIN_SCALE, s))

interface CanvasProps {
  entities: EditorEntity[]
  selectedId: string | null
  activeTool: string | null
  onEntityMove: (id: string, x: number, y: number) => void
  onEntitySelect: (id: string | null) => void
  onCanvasClick: (gridX: number, gridY: number) => void
  onEntityResize: (id: string, w: number, h: number) => void
  edgeStyles: Record<string, "dashed" | "solid">
  canvasCols: number
  canvasRows: number
}

export function Canvas({
  entities,
  selectedId,
  activeTool,
  onEntityMove,
  onEntitySelect,
  onCanvasClick,
  onEntityResize,
  edgeStyles,
  canvasCols,
  canvasRows,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    entityId: string
    startMouseX: number
    startMouseY: number
    startEntityX: number
    startEntityY: number
    moved: boolean
  } | null>(null)

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

  // One-shot auto-fit: on first load, scale the canvas to fit within the
  // viewport so the entire map is visible at once.
  const autoFitted = useRef(false)
  useLayoutEffect(() => {
    if (autoFitted.current || entities.length === 0) return
    autoFitted.current = true

    const container = containerRef.current
    if (!container) return

    const w = canvasCols * GRID
    const h = canvasRows * GRID
    const gap = 200 // 2 × container padding (100px each side)
    setScale(
      clampScale(Math.min((container.clientWidth - gap) / w, (container.clientHeight - gap) / h)),
    )
  }, [canvasCols, canvasRows, entities.length])

  // Pinch (two-finger) and ctrl+wheel zoom of the canvas. Native non-passive
  // listeners so we can preventDefault the browser's own page zoom/scroll.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let pinchStart: { dist: number; scale: number } | null = null
    const distance = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStart = { dist: distance(e.touches), scale: scaleRef.current }
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (pinchStart && e.touches.length === 2) {
        e.preventDefault()
        const d = distance(e.touches)
        if (pinchStart.dist === 0 || d === 0) return
        setScale(clampScale(pinchStart.scale * (d / pinchStart.dist)))
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStart = null
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return // trackpad pinch surfaces as ctrl+wheel
      e.preventDefault()
      setScale((s) => clampScale(s * (1 - e.deltaY * 0.01)))
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

  const onBlockMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      onEntitySelect(id)
      const entity = entities.find((en) => en.id === id)
      if (!entity) return

      dragRef.current = {
        entityId: id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startEntityX: entity.x,
        startEntityY: entity.y,
        moved: false,
      }
    },
    [entities, onEntitySelect],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pan = panDragRef.current
      if (pan) {
        const el = containerRef.current
        if (!el) return
        el.scrollLeft = pan.startScrollLeft - (e.clientX - pan.startX)
        el.scrollTop = pan.startScrollTop - (e.clientY - pan.startY)
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
      const newX = snap(drag.startEntityX * GRID + logicalDx) / GRID
      const newY = snap(drag.startEntityY * GRID + logicalDy) / GRID
      onEntityMove(drag.entityId, newX, newY)
    }

    const handleMouseUp = () => {
      if (panDragRef.current) {
        panDragRef.current = null
        if (containerRef.current) containerRef.current.style.cursor = ""
      }
      dragRef.current = null
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [onEntityMove, scale])

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest(".editor-block")) return

      if (activeTool && activeTool !== "select" && activeTool !== "pan") {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const logicalX = (e.clientX - rect.left) / scale
        const logicalY = (e.clientY - rect.top) / scale
        const gridX = snap(logicalX) / GRID
        const gridY = snap(logicalY) / GRID
        onCanvasClick(gridX, gridY)
      } else {
        onEntitySelect(null)
      }
    },
    [activeTool, onCanvasClick, onEntitySelect, scale],
  )

  const renderBlock = (entity: EditorEntity) => {
    const selected = entity.id === selectedId
    const props = {
      entity,
      selected,
      onMouseDown: onBlockMouseDown,
      onClick: onEntitySelect,
      onResize: onEntityResize,
      onMove: onEntityMove,
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
    if (!selectedId) return
    const ARROWS: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      // Don't hijack arrow keys while typing in the properties sidebar.
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
      const delta = ARROWS[e.key]
      if (!delta) return
      const entity = entities.find((en) => en.id === selectedId)
      if (!entity) return
      e.preventDefault()
      const [dx, dy] = delta
      if (e.shiftKey) {
        onEntityResize(entity.id, entity.w + dx, entity.h + dy)
      } else {
        onEntityMove(entity.id, entity.x + dx, entity.y + dy)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedId, entities, onEntityMove, onEntityResize])

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
            {entities.map(renderBlock)}
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
