import { bookStrings } from "./strings"
import "./BookingSkeleton.css"

// Placeholder grid shown while the floor plan loads, matching the app's
// shimmer-skeleton convention instead of a bare "loading" line.
export function FloorPlanSkeleton() {
  return (
    <div className="book-skeleton" role="status" aria-label={bookStrings.loading}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="book-skeleton__table" aria-hidden="true" />
      ))}
    </div>
  )
}

// Placeholder chips shown while the booking modal fetches available time slots.
export function SlotsSkeleton() {
  return (
    <div
      className="book-skeleton__slots"
      role="status"
      aria-label={bookStrings.modal.slots.loading}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="book-skeleton__chip" aria-hidden="true" />
      ))}
    </div>
  )
}
