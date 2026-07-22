import { useState } from "react"
import RemovableChipList from "./RemovableChipList"
import { useAdminStrings } from "@/features/admin/strings"

type IngredientsFieldProps = {
  value: string[]
  onChange: (next: string[]) => void
}

/** Free-text ingredient editor: type + Enter/Add, shown as removable chips. */
function IngredientsField({ value, onChange }: IngredientsFieldProps) {
  const [input, setInput] = useState("")
  const strings = useAdminStrings()

  const add = () => {
    const ingredient = input.trim()
    if (!ingredient) return
    if (!value.includes(ingredient)) onChange([...value, ingredient])
    setInput("")
  }

  return (
    <div className="admin-field">
      <span className="admin-field__label">{strings.menu.ingredients.label}</span>
      <div className="dish-ingredient-add">
        <input
          className="admin-field__input"
          value={input}
          placeholder={strings.menu.ingredients.placeholder}
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
          {strings.menu.ingredients.add}
        </button>
      </div>
      <RemovableChipList
        items={value}
        getRemoveLabel={(item) => strings.menu.ingredients.remove(item)}
        onRemove={(item) => onChange(value.filter((x) => x !== item))}
      />
    </div>
  )
}

export default IngredientsField
