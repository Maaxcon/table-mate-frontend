import { useCallback, useEffect, useRef } from "react"
import { snap, GRID } from "./types"
import type { EditorEntity } from "./types"
import { TableBlock } from "./entities/TableBlock"
import { ObstacleBlock } from "./entities/ObstacleBlock"
import { ThresholdBlock } from "./entities/ThresholdBlock"
import { PortalBlock } from "./entities/PortalBlock"
import "./Canvas.css"

interface CanvasProps {
  entities: EditorEntity[]
  selectedId: string | null
  activeTool: string | null
  onEntityMove: (id: string, x: number, y: number) => void
  onEntitySelect: (id: string | null) => void
  onCanvasClick: (gridX: number, gridY: number) => void
  onEntityResize: (id: string, w: number, h: number) => void
  edgeStyles: Record<string, "dashed" | "solid">
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

  const scale = 1

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

  return (
    <div ref={containerRef} className="editor-canvas__container">
      {/* The canvas is an application widget: it owns pointer placement and (below)
          keyboard move/resize, so it legitimately carries interaction handlers. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={canvasRef}
        className="editor-canvas"
        style={{ transform: `scale(${scale})` }}
        onMouseDown={handleCanvasMouseDown}
        role="application"
        aria-label="Floor plan editor"
      >
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
  )
}
