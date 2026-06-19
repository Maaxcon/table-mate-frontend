import type { EditorEntity } from "../types"
import { GRID, CANVAS_W, CANVAS_H, OVERHANG } from "../types"
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
}

export function ThresholdBlock({
  entity,
  selected,
  onMouseDown,
  onClick,
  onResize,
  onMove,
  canvasScale = 1,
}: ThresholdBlockProps) {
  const px = (v: number) => v * GRID
  const overhangL = entity.x < 0 ? OVERHANG : 0
  const overhangT = entity.y < 0 ? OVERHANG : 0
  const overhangR = entity.x + entity.w > CANVAS_W / GRID ? OVERHANG : 0
  const overhangB = entity.y + entity.h > CANVAS_H / GRID ? OVERHANG : 0

  return (
    <div
      className={[
        "editor-block",
        "editor-block--threshold",
        selected ? "editor-block--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: px(entity.x) - overhangL,
        top: px(entity.y) - overhangT,
        width: px(entity.w) + overhangL + overhangR,
        height: px(entity.h) + overhangT + overhangB,
      }}
      role="button"
      tabIndex={0}
      onMouseDown={(e) => onMouseDown(e, entity.id)}
      onClick={() => onClick(entity.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(entity.id)
      }}
    >
      <span className="editor-block__zone-label">{entity.label ?? ""}</span>
      {selected && onResize && onMove && (
        <ResizeHandles
          entityId={entity.id}
          entityType={entity.type}
          entityX={entity.x}
          entityY={entity.y}
          entityW={entity.w}
          entityH={entity.h}
          onResize={onResize}
          onMove={onMove}
          scale={canvasScale}
        />
      )}
    </div>
  )
}
