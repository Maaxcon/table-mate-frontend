import { useState } from "react"
import RemovableChipList from "./RemovableChipList"

type IngredientsFieldProps = {
  value: string[]
  onChange: (next: string[]) => void
}

/** Free-text ingredient editor: type + Enter/Add, shown as removable chips. */
function IngredientsField({ value, onChange }: IngredientsFieldProps) {
  const [input, setInput] = useState("")

  const add = () => {
    const ingredient = input.trim()
    if (!ingredient) return
    if (!value.includes(ingredient)) onChange([...value, ingredient])
    setInput("")
  }

  return (
    <div className="admin-field">
      <span className="admin-field__label">Ingredients</span>
      <div className="dish-ingredient-add">
        <input
          className="admin-field__input"
          value={input}
          placeholder="Type an ingredient, press Enter"
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
          Add
        </button>
      </div>
      <RemovableChipList
        items={value}
        onRemove={(item) => onChange(value.filter((x) => x !== item))}
      />
    </div>
  )
}

export default IngredientsField
