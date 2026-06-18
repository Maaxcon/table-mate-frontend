import type { EditorEntity } from "../types"
import { GRID } from "../types"
import { ResizeHandles } from "./ResizeHandles"
import "./blocks.css"

interface ObstacleBlockProps {
  entity: EditorEntity
  selected: boolean
  onMouseDown: (e: React.MouseEvent, id: string) => void
  onClick: (id: string) => void
  onResize?: (id: string, w: number, h: number) => void
  canvasScale?: number
}

export function ObstacleBlock({
  entity,
  selected,
  onMouseDown,
  onClick,
  onResize,
  canvasScale = 1,
}: ObstacleBlockProps) {
  const px = (v: number) => v * GRID

  return (
    <div
      className={[
        "editor-block",
        "editor-block--obstacle",
        selected ? "editor-block--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: px(entity.x),
        top: px(entity.y),
        width: px(entity.w),
        height: px(entity.h),
      }}
      role="button"
      tabIndex={0}
      onMouseDown={(e) => onMouseDown(e, entity.id)}
      onClick={() => onClick(entity.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(entity.id)
      }}
    >
      {selected && onResize && (
        <ResizeHandles entityId={entity.id} onResize={onResize} scale={canvasScale} />
      )}
    </div>
  )
}
