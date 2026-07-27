import { useState } from "react"
import { createAllergen } from "@/features/admin/api/menu"
import RemovableChipList from "./RemovableChipList"
import { useAdminStrings } from "@/features/admin/strings"

type AllergensFieldProps = {
  value: string[]
  options: string[]
  onChange: (next: string[]) => void
}

/** Allergen editor: pick from a known list, shown as removable chips. */
function AllergensField({ value, options, onChange }: AllergensFieldProps) {
  const strings = useAdminStrings()
  const [newAllergen, setNewAllergen] = useState("")
  const [createdOptions, setCreatedOptions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const availableOptions = [...new Set([...options, ...createdOptions])]

  const handleAdd = async () => {
    const name = newAllergen.trim()
    if (!name) return
    setSubmitting(true)
    setError(null)
    try {
      const allergen = await createAllergen(name)
      setCreatedOptions((current) => [...current, allergen.name])
      if (!value.includes(allergen.name)) onChange([...value, allergen.name])
      setNewAllergen("")
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.menu.allergens.addError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-field">
      <span className="admin-field__label">{strings.menu.allergens.label}</span>
      <select
        className="admin-field__input"
        value=""
        onChange={(e) => {
          const allergen = e.target.value
          if (allergen) onChange([...value, allergen])
        }}
      >
        <option value="">{strings.menu.allergens.placeholder}</option>
        {availableOptions
          .filter((a) => !value.includes(a))
          .map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
      </select>
      <div className="dish-allergens__add">
        <input
          className="admin-field__input"
          value={newAllergen}
          onChange={(event) => setNewAllergen(event.target.value)}
          placeholder={strings.menu.allergens.newPlaceholder}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void handleAdd()
            }
          }}
        />
        <button
          type="button"
          className="menu-admin__btn"
          disabled={submitting || !newAllergen.trim()}
          onClick={() => void handleAdd()}
        >
          {submitting ? strings.menu.allergens.adding : strings.menu.allergens.add}
        </button>
      </div>
      {error && <p className="admin-form__status admin-form__status--error">{error}</p>}
      <RemovableChipList
        items={value}
        getRemoveLabel={(item) => strings.menu.allergens.remove(item)}
        onRemove={(item) => onChange(value.filter((x) => x !== item))}
      />
    </div>
  )
}

export default AllergensField
