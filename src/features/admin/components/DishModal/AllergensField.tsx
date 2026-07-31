import { useState } from "react"
import RemovableChipList from "./RemovableChipList"
import { useAdminStrings } from "@/features/admin/strings"

type AllergensFieldProps = {
  value: string[]
  onChange: (next: string[]) => void
}

/** Free-text allergen editor: type + Enter/Add, shown as removable chips. */
function AllergensField({ value, onChange }: AllergensFieldProps) {
  const [input, setInput] = useState("")
  const strings = useAdminStrings()

  const add = () => {
    const allergen = input.trim()
    if (!allergen) return
    if (!value.includes(allergen)) onChange([...value, allergen])
    setInput("")
  }

  return (
    <div className="admin-field">
      <span className="admin-field__label">{strings.menu.allergens.label}</span>
      <div className="dish-ingredient-add">
        <input
          className="admin-field__input"
          value={input}
          placeholder={strings.menu.allergens.placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
        />
        <button
          type="button"
          className="menu-admin__btn menu-admin__btn--primary"
          onClick={add}
          disabled={!input.trim()}
        >
          {strings.menu.allergens.add}
        </button>
      </div>
      <RemovableChipList
        items={value}
        getRemoveLabel={(item) => strings.menu.allergens.remove(item)}
        onRemove={(item) => onChange(value.filter((x) => x !== item))}
      />
    </div>
  )
}

export default AllergensField
