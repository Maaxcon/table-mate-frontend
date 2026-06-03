type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "tel" | "url" | "number"
  placeholder?: string
  hint?: string
  inputMode?: "text" | "decimal"
  step?: string
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  inputMode,
  step,
}: TextFieldProps) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      <input
        className="admin-field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="admin-field__hint">{hint}</span>}
    </label>
  )
}

export default TextField
