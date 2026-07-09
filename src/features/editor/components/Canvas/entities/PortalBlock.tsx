import type { CSSProperties } from "react"
import type { EditorEntity } from "@/features/editor/types"
import { GRID, cssVars, uprightContentStyle } from "@/features/editor/types"
import { ResizeHandles } from "./ResizeHandles"
import "./blocks.css"

interface PortalBlockProps {
  entity: EditorEntity
  selected: boolean
  onMouseDown: (e: React.MouseEvent, id: string) => void
  onClick: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void
  onResize?: (id: string, w: number, h: number) => void
  onMove?: (id: string, x: number, y: number) => void
  canvasScale?: number
  canvasCols: number
  canvasRows: number
}

export function PortalBlock({
  entity,
  selected,
  onMouseDown,
  onClick,
  onResize,
  onMove,
  canvasScale = 1,
  canvasCols,
  canvasRows,
}: PortalBlockProps) {
  const px = (v: number) => v * GRID

  const style: CSSProperties = {
    left: px(entity.x),
    top: px(entity.y),
    width: px(entity.w),
    height: px(entity.h),
    transform: entity.rotation ? `rotate(${entity.rotation}deg)` : undefined,
    ...cssVars({ "--canvas-scale": canvasScale }),
  }

  return (
    <div
      className={["editor-block", "editor-block--portal", selected ? "editor-block--selected" : ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`Portal${entity.label ? ` to ${entity.label}` : ""}`}
      onMouseDown={(e) => onMouseDown(e, entity.id)}
      onClick={(e) => onClick(e, entity.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(e, entity.id)
      }}
    >
      <span style={uprightContentStyle(entity.rotation)}>
        <span className="editor-block__zone-label">{entity.label ?? "Portal"}</span>
      </span>
      {selected && onResize && onMove && (
        <ResizeHandles
          entityId={entity.id}
          entityType={entity.type}
          entityX={entity.x}
          entityY={entity.y}
          entityW={entity.w}
          entityH={entity.h}
          entityRotation={entity.rotation}
          onResize={onResize}
          onMove={onMove}
          scale={canvasScale}
          canvasCols={canvasCols}
          canvasRows={canvasRows}
        />
      )}
    </div>
  )
}
