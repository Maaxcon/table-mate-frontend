interface TimeSlotGridProps {
  slots: string[]
  selectedTime: string | null
  onSelect: (time: string) => void
  disabledSlots?: string[]
}

// Shared by BookModal and RescheduleModal.
export function TimeSlotGrid({
  slots,
  selectedTime,
  onSelect,
  disabledSlots = [],
}: TimeSlotGridProps) {
  const disabled = new Set(disabledSlots)

  return (
    <div className="book-modal__times">
      {slots.map((t) => {
        const isDisabled = disabled.has(t)
        const isSelected = selectedTime === t
        return (
          <button
            key={t}
            type="button"
            className={[
              "book-modal__time-btn",
              isSelected ? "book-modal__time-btn--active" : "",
              isDisabled ? "book-modal__time-btn--disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelect(t)}
            aria-pressed={isSelected}
            disabled={isDisabled}
          >
            {t}
          </button>
        )
      })}
    </div>
  )
}
