import { useCallback, useEffect, useRef } from "react"
import { GRID, snap } from "../types"
import "./blocks.css"

interface ResizeHandlesProps {
  entityId: string
  onResize: (id: string, w: number, h: number) => void
  scale: number
}

type Corner = "nw" | "ne" | "sw" | "se"

export function ResizeHandles({ entityId, onResize, scale }: ResizeHandlesProps) {
  const dragRef = useRef<{
    corner: Corner
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent, corner: Corner) => {
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
    }
  }, [])

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
      onResize(entityId, newW, newH)
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
  }, [entityId, onResize, scale])

  const corners: Corner[] = ["nw", "ne", "sw", "se"]

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
