import { useBookStrings } from "./strings"

interface SlotSummaryProps {
  title: string
  tableNumber: string
  date: string
  time: string
  endTime: string
  duration: number
  guests: number
}

// Shared by BookModal and RescheduleModal.
export function SlotSummary({
  title,
  tableNumber,
  date,
  time,
  endTime,
  duration,
  guests,
}: SlotSummaryProps) {
  const bookStrings = useBookStrings()
  return (
    <section className="book-modal__section book-modal__section--summary">
      <h3 className="book-modal__section-title">{title}</h3>
      <div className="book-modal__summary">
        <div className="book-modal__summary-row">
          <span>{bookStrings.modal.summary.table}</span>
          <span>#{tableNumber}</span>
        </div>
        <div className="book-modal__summary-row">
          <span>{bookStrings.modal.summary.date}</span>
          <span>{date}</span>
        </div>
        <div className="book-modal__summary-row">
          <span>{bookStrings.modal.summary.time}</span>
          <span>
            {time} &ndash; {endTime}
          </span>
        </div>
        <div className="book-modal__summary-row">
          <span>{bookStrings.modal.summary.duration}</span>
          <span>
            {duration} {bookStrings.modal.durationUnit}
          </span>
        </div>
        <div className="book-modal__summary-row">
          <span>{bookStrings.modal.summary.guests}</span>
          <span>{guests}</span>
        </div>
      </div>
    </section>
  )
}
