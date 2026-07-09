interface DurationInputProps {
  value: number
  min: number
  // Omit (or Infinity) for no upper clamp — RescheduleModal doesn't cap
  // duration, while BookModal caps it to the time left before close.
  max?: number
  onChange: (value: number) => void
  error: string | null
}

// Shared by BookModal and RescheduleModal.
export function DurationInput({ value, min, max = Infinity, onChange, error }: DurationInputProps) {
  return (
    <div className="book-modal__duration-input">
      <input
        type="number"
        className="book-modal__duration-field"
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        step={15}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(Number(e.target.value), max)))}
      />
      {error && <p className="book-modal__hint">{error}</p>}
    </div>
  )
}
