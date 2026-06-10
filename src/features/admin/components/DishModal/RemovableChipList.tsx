import { LuX } from "react-icons/lu"

type RemovableChipListProps = {
  items: string[]
  onRemove: (item: string) => void
}

/** Shared chip list with a remove button per item (ingredients, allergens). */
function RemovableChipList({ items, onRemove }: RemovableChipListProps) {
  if (items.length === 0) return null
  return (
    <div className="dish-allergens">
      {items.map((item) => (
        <span key={item} className="dish-allergen">
          {item}
          <button
            type="button"
            className="dish-allergen__remove"
            aria-label={`Remove ${item}`}
            onClick={() => onRemove(item)}
          >
            <LuX aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  )
}

export default RemovableChipList
