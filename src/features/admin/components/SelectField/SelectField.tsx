export type SelectOption = { value: string; label: string }

type SelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  hint?: string
}

function SelectField({ label, value, onChange, options, hint }: SelectFieldProps) {
  // Keep a saved value visible even if it is not in the predefined list.
  const hasValue = value !== "" && options.some((o) => o.value === value)
  const allOptions = hasValue || value === "" ? options : [{ value, label: value }, ...options]

  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      <select
        className="admin-field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="admin-field__hint">{hint}</span>}
    </label>
  )
}

export default SelectField
