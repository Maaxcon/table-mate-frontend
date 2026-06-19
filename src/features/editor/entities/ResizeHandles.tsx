import { useCallback, useEffect, useRef } from "react"
import { GRID, CANVAS_W, CANVAS_H, snap, SIZE_CONSTRAINTS } from "../types"
import type { EntityType } from "../types"
import "./blocks.css"

interface ResizeHandlesProps {
  entityId: string
  entityType: EntityType
  entityX: number
  entityY: number
  entityW: number
  entityH: number
  onResize: (id: string, w: number, h: number) => void
  onMove: (id: string, x: number, y: number) => void
  scale: number
}

type Corner = "nw" | "ne" | "sw" | "se"

export function ResizeHandles({
  entityId,
  entityType,
  entityX,
  entityY,
  entityW,
  entityH,
  onResize,
  onMove,
  scale,
}: ResizeHandlesProps) {
  const dragRef = useRef<{
    corner: Corner
    startX: number
    startY: number
    startW: number
    startH: number
    startEntityX: number
    startEntityY: number
  } | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, corner: Corner) => {
      e.preventDefault()
      e.stopPropagation()
      const el = (e.currentTarget as HTMLElement).parentElement
      if (!el) return
      dragRef.current = {
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startW: Math.round(el.offsetWidth / GRID),
        startH: Math.round(el.offsetHeight / GRID),
        startEntityX: entityX,
        startEntityY: entityY,
      }
    },
    [entityX, entityY],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = (e.clientX - drag.startX) / scale
      const dy = (e.clientY - drag.startY) / scale
      let newW = drag.startW
      let newH = drag.startH
      if (drag.corner.includes("e")) newW = Math.max(1, snap(drag.startW * GRID + dx) / GRID)
      if (drag.corner.includes("w")) newW = Math.max(1, snap(drag.startW * GRID - dx) / GRID)
      if (drag.corner.includes("s")) newH = Math.max(1, snap(drag.startH * GRID + dy) / GRID)
      if (drag.corner.includes("n")) newH = Math.max(1, snap(drag.startH * GRID - dy) / GRID)
      const c = SIZE_CONSTRAINTS[entityType]
      if (c) {
        newW = Math.max(c.minW, Math.min(c.maxW, newW))
        newH = Math.max(c.minH, Math.min(c.maxH, newH))
        if (c.lockAspect) {
          const side = Math.max(newW, newH)
          newW = side
          newH = side
        }
      }
      let newX = drag.startEntityX
      let newY = drag.startEntityY
      if (drag.corner.includes("w")) newX = drag.startEntityX + drag.startW - newW
      if (drag.corner.includes("n")) newY = drag.startEntityY + drag.startH - newH
      onResize(entityId, newW, newH)
      onMove(entityId, newX, newY)
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
  }, [entityId, entityType, onResize, onMove, scale])

  const atTop = entityY <= 0
  const atBottom = entityY + entityH >= CANVAS_H / GRID
  const atLeft = entityX <= 0
  const atRight = entityX + entityW >= CANVAS_W / GRID

  const allCorners: Corner[] = ["nw", "ne", "sw", "se"]
  const corners = allCorners.filter((c) => {
    if (c === "nw" && (atTop || atLeft)) return false
    if (c === "ne" && (atTop || atRight)) return false
    if (c === "sw" && (atBottom || atLeft)) return false
    if (c === "se" && (atBottom || atRight)) return false
    return true
  })

  return (
    <>
      {corners.map((c) => (
        <div
          key={c}
          className={`editor-block__resize editor-block__resize--${c}`}
          role="button"
          tabIndex={0}
          onMouseDown={(e) => handleMouseDown(e, c)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleMouseDown(e as unknown as React.MouseEvent, c)
          }}
        />
      ))}
    </>
  )
}
