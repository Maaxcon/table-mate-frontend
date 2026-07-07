import { useCallback, useEffect, useRef } from "react"
import { GRID, rotatedAABB, snap, SIZE_CONSTRAINTS } from "@/features/editor/types"
import type { EntityType } from "@/features/editor/types"
import "./blocks.css"

interface ResizeHandlesProps {
  entityId: string
  entityType: EntityType
  entityX: number
  entityY: number
  entityW: number
  entityH: number
  entityRotation?: number
  onResize: (id: string, w: number, h: number) => void
  onMove: (id: string, x: number, y: number) => void
  scale: number
  canvasCols: number
  canvasRows: number
}

type Corner = "nw" | "ne" | "sw" | "se"

export function ResizeHandles({
  entityId,
  entityType,
  entityX,
  entityY,
  entityW,
  entityH,
  entityRotation,
  onResize,
  onMove,
  scale,
  canvasCols,
  canvasRows,
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
      let dx = (e.clientX - drag.startX) / scale
      let dy = (e.clientY - drag.startY) / scale
      // Rotate drag delta from screen-space to entity-space so handles
      // behave intuitively on rotated entities.
      if (entityRotation) {
        const rad = (-entityRotation * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const rdx = dx * cos - dy * sin
        const rdy = dx * sin + dy * cos
        dx = rdx
        dy = rdy
      }
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
  }, [entityId, entityType, entityRotation, onResize, onMove, scale])

  const aabb = rotatedAABB(entityX, entityY, entityW, entityH, entityRotation)
  const atTop = aabb.y <= 0
  const atBottom = aabb.y + aabb.h >= canvasRows
  const atLeft = aabb.x <= 0
  const atRight = aabb.x + aabb.w >= canvasCols

  const cornerLabels: Record<Corner, string> = {
    nw: "top-left",
    ne: "top-right",
    sw: "bottom-left",
    se: "bottom-right",
  }

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
          aria-label={`Resize ${cornerLabels[c]}`}
          onMouseDown={(e) => handleMouseDown(e, c)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleMouseDown(e as unknown as React.MouseEvent, c)
          }}
        />
      ))}
    </>
  )
}
