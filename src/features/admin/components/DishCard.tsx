import { LuGripVertical } from "react-icons/lu"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { AdminMenuItem } from "../types"

type DishCardProps = {
  item: AdminMenuItem
  onEdit: (item: AdminMenuItem) => void
}

function DishCard({ item, onEdit }: DishCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.public_id,
  })

  return (
    <li
      ref={setNodeRef}
      className="menu-admin__dish-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      <button
        type="button"
        className="menu-admin__drag"
        aria-label={`Drag to reorder ${item.name}`}
        {...attributes}
        {...listeners}
      >
        <LuGripVertical aria-hidden="true" />
      </button>
      <button type="button" className="menu-admin__dish-main" onClick={() => onEdit(item)}>
        {item.image ? (
          <img className="menu-admin__dish-img" src={item.image} alt="" />
        ) : (
          <span className="menu-admin__dish-img menu-admin__dish-img--empty">No photo</span>
        )}
        <span className="menu-admin__dish-body">
          <span className="menu-admin__dish-name">{item.name}</span>
          <span className="menu-admin__dish-meta">
            <span className="menu-admin__dish-price">{Number(item.price).toFixed(2)}</span>
            <span
              className={`menu-admin__dish-status${
                item.is_available ? "" : " menu-admin__dish-status--off"
              }`}
            >
              {item.is_available ? "Available" : "Hidden"}
            </span>
          </span>
        </span>
      </button>
    </li>
  )
}

export default DishCard
