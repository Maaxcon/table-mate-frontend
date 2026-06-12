import RemovableChipList from "./RemovableChipList"

type AllergensFieldProps = {
  value: string[]
  options: string[]
  onChange: (next: string[]) => void
}

/** Allergen editor: pick from a known list, shown as removable chips. */
function AllergensField({ value, options, onChange }: AllergensFieldProps) {
  return (
    <div className="admin-field">
      <span className="admin-field__label">Allergens</span>
      <select
        className="admin-field__input"
        value=""
        onChange={(e) => {
          const allergen = e.target.value
          if (allergen) onChange([...value, allergen])
        }}
      >
        <option value="">Add allergen…</option>
        {options
          .filter((a) => !value.includes(a))
          .map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
      </select>
      <RemovableChipList
        items={value}
        onRemove={(item) => onChange(value.filter((x) => x !== item))}
      />
    </div>
  )
}

export default AllergensField
