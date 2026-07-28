import RemovableChipList from "./RemovableChipList"
import { useAdminStrings } from "@/features/admin/strings"

type AllergensFieldProps = {
  value: string[]
  options: string[]
  onChange: (next: string[]) => void
}

/** Allergen editor: select seeded catalog values, shown as removable chips. */
function AllergensField({ value, options, onChange }: AllergensFieldProps) {
  const strings = useAdminStrings()

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
        getRemoveLabel={(item) => strings.menu.allergens.remove(item)}
        onRemove={(item) => onChange(value.filter((x) => x !== item))}
      />
    </div>
  )
}

export default AllergensField
