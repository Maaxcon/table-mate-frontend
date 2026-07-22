import { LuEye, LuEyeOff, LuGripVertical } from "react-icons/lu"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { AdminMenuItem } from "@/features/admin/types"
import { useAdminStrings } from "@/features/admin/strings"

type DishCardProps = {
  item: AdminMenuItem
  onEdit: (item: AdminMenuItem) => void
  onToggleAvailable: (item: AdminMenuItem) => void
  disabled?: boolean
  selected?: boolean
  onToggleSelect?: (publicId: string) => void
}

function DishCard({
  item,
  onEdit,
  onToggleAvailable,
  disabled = false,
  selected = false,
  onToggleSelect,
}: DishCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.public_id,
    disabled,
  })
  const strings = useAdminStrings()

  return (
    <li
      ref={setNodeRef}
      className={`menu-admin__dish-card${selected ? " menu-admin__dish-card--selected" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          className="menu-admin__dish-select"
          checked={selected}
          onChange={() => onToggleSelect(item.public_id)}
          aria-label={strings.menu.dishCard.selectAria(item.name)}
        />
      )}
      {!disabled && (
        <button
          type="button"
          className="menu-admin__drag"
          aria-label={strings.menu.dishCard.dragAria(item.name)}
          {...attributes}
          {...listeners}
        >
          <LuGripVertical aria-hidden="true" />
        </button>
      )}
      <button type="button" className="menu-admin__dish-main" onClick={() => onEdit(item)}>
        {item.image ? (
          <img className="menu-admin__dish-img" src={item.image} alt="" />
        ) : (
          <span className="menu-admin__dish-img menu-admin__dish-img--empty">
            {strings.menu.dishCard.noPhoto}
          </span>
        )}
        <span className="menu-admin__dish-body">
          <span className="menu-admin__dish-name">{item.name}</span>
          <span className="menu-admin__dish-meta">
            <span className="menu-admin__dish-price">{Number(item.price).toFixed(2)}</span>
            {item.weight_grams != null && (
              <span className="menu-admin__dish-weight">
                {strings.menu.dishCard.weight(item.weight_grams)}
              </span>
            )}
          </span>
          {item.allergens && item.allergens.length > 0 && (
            <span className="menu-admin__dish-allergens">
              {strings.menu.dishCard.allergens(item.allergens.join(", "))}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        className={`menu-admin__avail${item.is_available ? "" : " menu-admin__avail--off"}`}
        onClick={() => onToggleAvailable(item)}
        aria-pressed={item.is_available}
        aria-label={
          item.is_available
            ? strings.menu.dishCard.hideAria(item.name)
            : strings.menu.dishCard.showAria(item.name)
        }
        title={
          item.is_available
            ? strings.menu.dishCard.availableTitle
            : strings.menu.dishCard.hiddenTitle
        }
      >
        {item.is_available ? <LuEye aria-hidden="true" /> : <LuEyeOff aria-hidden="true" />}
        <span className="menu-admin__avail-label">
          {item.is_available ? strings.menu.dishCard.available : strings.menu.dishCard.hidden}
        </span>
      </button>
    </li>
  )
}

export default DishCard
