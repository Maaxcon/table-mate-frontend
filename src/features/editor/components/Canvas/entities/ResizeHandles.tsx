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
type Handle = Corner | "n" | "e" | "s" | "w"

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
    handle: Handle
    startX: number
    startY: number
    startW: number
    startH: number
    startEntityX: number
    startEntityY: number
  } | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: Handle) => {
      e.preventDefault()
      e.stopPropagation()
      const el = (e.currentTarget as HTMLElement).parentElement
      if (!el) return
      dragRef.current = {
        handle,
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
      const stepX = snap(dx) / GRID
      const stepY = snap(dy) / GRID

      let left = drag.startEntityX
      let top = drag.startEntityY
      let right = drag.startEntityX + drag.startW
      let bottom = drag.startEntityY + drag.startH

      if (drag.handle.includes("w")) left = drag.startEntityX + stepX
      if (drag.handle.includes("e")) right = drag.startEntityX + drag.startW + stepX
      if (drag.handle.includes("n")) top = drag.startEntityY + stepY
      if (drag.handle.includes("s")) bottom = drag.startEntityY + drag.startH + stepY

      let newW = Math.max(1, right - left)
      let newH = Math.max(1, bottom - top)
      const c = SIZE_CONSTRAINTS[entityType]

      if (c?.lockAspect) {
        const minSide = c.minW
        const maxSide = c.maxW
        const startRight = drag.startEntityX + drag.startW
        const startBottom = drag.startEntityY + drag.startH
        const startCenterX = drag.startEntityX + drag.startW / 2
        const startCenterY = drag.startEntityY + drag.startH / 2
        const h = drag.handle

        if (h === "n" || h === "s") {
          let side = drag.startH + (h === "s" ? stepY : -stepY)
          side = Math.max(minSide, Math.min(maxSide, side))
          if (h === "s") {
            top = drag.startEntityY
            bottom = top + side
          } else {
            bottom = startBottom
            top = bottom - side
          }
          left = startCenterX - side / 2
          right = left + side
          newW = side
          newH = side
        } else if (h === "w" || h === "e") {
          let side = drag.startW + (h === "e" ? stepX : -stepX)
          side = Math.max(minSide, Math.min(maxSide, side))
          if (h === "e") {
            left = drag.startEntityX
            right = left + side
          } else {
            right = startRight
            left = right - side
          }
          top = startCenterY - side / 2
          bottom = top + side
          newW = side
          newH = side
        } else {
          let side = Math.max(newW, newH)
          side = Math.max(minSide, Math.min(maxSide, side))
          if (h === "se") {
            left = drag.startEntityX
            top = drag.startEntityY
            right = left + side
            bottom = top + side
          } else if (h === "sw") {
            right = startRight
            top = drag.startEntityY
            left = right - side
            bottom = top + side
          } else if (h === "ne") {
            left = drag.startEntityX
            bottom = startBottom
            right = left + side
            top = bottom - side
          } else {
            right = startRight
            bottom = startBottom
            left = right - side
            top = bottom - side
          }
          newW = side
          newH = side
        }
      } else if (c) {
        const startRight = drag.startEntityX + drag.startW
        const startBottom = drag.startEntityY + drag.startH
        newW = Math.max(c.minW, Math.min(c.maxW, newW))
        newH = Math.max(c.minH, Math.min(c.maxH, newH))
        if (drag.handle.includes("w") && !drag.handle.includes("e")) {
          left = startRight - newW
          right = startRight
        } else if (drag.handle.includes("e") && !drag.handle.includes("w")) {
          right = drag.startEntityX + newW
          left = right - newW
        }
        if (drag.handle.includes("n") && !drag.handle.includes("s")) {
          top = startBottom - newH
          bottom = startBottom
        } else if (drag.handle.includes("s") && !drag.handle.includes("n")) {
          bottom = drag.startEntityY + newH
          top = bottom - newH
        }
      }

      const newX = c?.lockAspect ? Math.round(left) : left
      const newY = c?.lockAspect ? Math.round(top) : top
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

  const handleLabels: Record<Handle, string> = {
    n: "top",
    e: "right",
    s: "bottom",
    w: "left",
    nw: "top-left",
    ne: "top-right",
    sw: "bottom-left",
    se: "bottom-right",
  }

  const allHandles: Handle[] = ["n", "e", "s", "w", "nw", "ne", "sw", "se"]
  const handles = allHandles.filter((handle) => {
    if (handle.includes("n") && atTop) return false
    if (handle.includes("s") && atBottom) return false
    if (handle.includes("w") && atLeft) return false
    if (handle.includes("e") && atRight) return false
    return true
  })

  return (
    <>
      {handles.map((handle) => (
        <div
          key={handle}
          className={`editor-block__resize editor-block__resize--${handle}`}
          role="button"
          tabIndex={0}
          aria-label={`Resize ${handleLabels[handle]}`}
          onMouseDown={(e) => handleMouseDown(e, handle)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleMouseDown(e as unknown as React.MouseEvent, handle)
          }}
        />
      ))}
    </>
  )
}
