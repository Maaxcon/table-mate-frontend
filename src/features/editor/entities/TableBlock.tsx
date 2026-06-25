import type { EditorEntity } from "../types"
import { GRID } from "../types"
import "./blocks.css"

interface TableBlockProps {
  entity: EditorEntity
  selected: boolean
  onMouseDown: (e: React.MouseEvent, id: string) => void
  onClick: (id: string) => void
}

export function TableBlock({ entity, selected, onMouseDown, onClick }: TableBlockProps) {
  const px = (v: number) => v * GRID

  return (
    <div
      className={[
        "editor-block",
        "editor-block--table",
        `editor-block--${entity.type}`,
        selected ? "editor-block--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: px(entity.x),
        top: px(entity.y),
        width: px(entity.w),
        height: px(entity.h),
        transform: entity.rotation ? `rotate(${entity.rotation}deg)` : undefined,
      }}
      role="button"
      tabIndex={0}
      aria-label={`Table ${entity.label ?? entity.id.slice(-4)}${
        entity.capacity ? `, ${entity.capacity} seats` : ""
      }`}
      onMouseDown={(e) => onMouseDown(e, entity.id)}
      onClick={() => onClick(entity.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(entity.id)
      }}
    >
      <span className="editor-block__label">{entity.label ?? entity.id.slice(-4)}</span>
      {entity.capacity && <span className="editor-block__capacity">{entity.capacity}P</span>}
    </div>
  )
}
