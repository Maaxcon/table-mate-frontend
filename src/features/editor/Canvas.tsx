import { useCallback, useEffect, useRef, useState } from "react"
import { snap, GRID, CANVAS_W, CANVAS_H } from "./types"
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
  const [scale, setScale] = useState(1)
  const dragRef = useRef<{
    entityId: string
    startMouseX: number
    startMouseY: number
    startEntityX: number
    startEntityY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const s = Math.min(width / CANVAS_W, height / CANVAS_H, 1)
        setScale(s)
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
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
      <div
        ref={canvasRef}
        className="editor-canvas"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        onMouseDown={handleCanvasMouseDown}
        role="presentation"
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
