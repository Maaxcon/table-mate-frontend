import { useId } from "react"

type TextFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "tel" | "url" | "number"
  placeholder?: string
  hint?: string
  inputMode?: "text" | "decimal"
  step?: string
  error?: string
  onBlur?: () => void
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
  error,
  onBlur,
}: TextFieldProps) {
  const errorId = useId()
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      <input
        className={`admin-field__input${error ? " admin-field__input--error" : ""}`}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <span id={errorId} className="admin-field__error">
          {error}
        </span>
      ) : (
        hint && <span className="admin-field__hint">{hint}</span>
      )}
    </label>
  )
}

export default TextField
