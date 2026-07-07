interface GuestStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
}

// Shared by BookModal and RescheduleModal.
export function GuestStepper({ value, min = 1, max, onChange }: GuestStepperProps) {
  return (
    <div className="book-modal__guests">
      <button
        type="button"
        className="book-modal__guest-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        &minus;
      </button>
      <span className="book-modal__guest-count">{value}</span>
      <button
        type="button"
        className="book-modal__guest-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  )
}
