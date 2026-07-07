interface TimeSlotGridProps {
  slots: string[]
  selectedTime: string | null
  onSelect: (time: string) => void
}

// Shared by BookModal and RescheduleModal.
export function TimeSlotGrid({ slots, selectedTime, onSelect }: TimeSlotGridProps) {
  return (
    <div className="book-modal__times">
      {slots.map((t) => (
        <button
          key={t}
          type="button"
          className={[
            "book-modal__time-btn",
            selectedTime === t ? "book-modal__time-btn--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onSelect(t)}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
