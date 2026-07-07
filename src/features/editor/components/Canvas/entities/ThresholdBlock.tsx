import type { CSSProperties } from "react"
import type { EditorEntity } from "@/features/editor/types"
import { GRID, cssVars, uprightContentStyle } from "@/features/editor/types"
import { ResizeHandles } from "./ResizeHandles"
import "./blocks.css"

interface ThresholdBlockProps {
  entity: EditorEntity
  selected: boolean
  onMouseDown: (e: React.MouseEvent, id: string) => void
  onClick: (id: string) => void
  onResize?: (id: string, w: number, h: number) => void
  onMove?: (id: string, x: number, y: number) => void
  canvasScale?: number
  canvasCols: number
  canvasRows: number
}

export function ThresholdBlock({
  entity,
  selected,
  onMouseDown,
  onClick,
  onResize,
  onMove,
  canvasScale = 1,
  canvasCols,
  canvasRows,
}: ThresholdBlockProps) {
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
      className={[
        "editor-block",
        "editor-block--threshold",
        selected ? "editor-block--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`Threshold${entity.label ? ` ${entity.label}` : ""}`}
      onMouseDown={(e) => onMouseDown(e, entity.id)}
      onClick={() => onClick(entity.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(entity.id)
      }}
    >
      <span style={uprightContentStyle(entity.rotation)}>
        <span className="editor-block__zone-label">{entity.label ?? ""}</span>
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
