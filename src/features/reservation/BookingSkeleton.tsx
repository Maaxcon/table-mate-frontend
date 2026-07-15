import { useBookStrings } from "./strings"
import "./BookingSkeleton.css"

// Placeholder grid shown while the floor plan loads, matching the app's
// shimmer-skeleton convention instead of a bare "loading" line.
export function FloorPlanSkeleton() {
  const bookStrings = useBookStrings()
  return (
    <div className="book-skeleton" role="status" aria-label={bookStrings.loading}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="book-skeleton__table" aria-hidden="true" />
      ))}
    </div>
  )
}

// Placeholder cards shown while the guest's bookings load, mirroring the
// ActiveBookings card (date block + content lines) for a consistent feel.
export function BookingsSkeleton() {
  const bookStrings = useBookStrings()
  return (
    <div className="book-skeleton__bookings" role="status" aria-label={bookStrings.loading}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="book-skeleton__booking" aria-hidden="true">
          <div className="book-skeleton__booking-date" />
          <div className="book-skeleton__booking-body">
            <div className="book-skeleton__line book-skeleton__line--title" />
            <div className="book-skeleton__line book-skeleton__line--meta" />
            <div className="book-skeleton__line book-skeleton__line--actions" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Placeholder chips shown while the booking modal fetches available time slots.
export function SlotsSkeleton() {
  const bookStrings = useBookStrings()
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
