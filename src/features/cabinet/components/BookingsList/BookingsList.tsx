import { LuCalendarClock, LuUsers } from "react-icons/lu"
import type { Reservation } from "../../types"
import { formatDateTime } from "../../utils"
import "./BookingsList.css"

type BookingsListProps = {
  bookings: Reservation[]
  error: string | null
  onModify: (booking: Reservation) => void
  onCancel: (booking: Reservation) => void
}

export function BookingsList({ bookings, error, onModify, onCancel }: BookingsListProps) {
  return (
    <section className="cabinet-section" aria-labelledby="cabinet-bookings-title">
      <h2 className="cabinet-section__title" id="cabinet-bookings-title">
        Active bookings
      </h2>

      {error ? (
        <p className="cabinet-section__empty cabinet-section__empty--error">{error}</p>
      ) : bookings.length === 0 ? (
        <p className="cabinet-section__empty">You have no active bookings.</p>
      ) : (
        <ul className="cabinet-bookings">
          {bookings.map((booking) => (
            <li key={booking.public_id} className="booking-card">
              <div className="booking-card__main">
                <span className={`booking-card__status booking-card__status--${booking.status}`}>
                  {booking.status}
                </span>
                <p className="booking-card__row">
                  <LuCalendarClock aria-hidden="true" />
                  <span>{formatDateTime(booking.start_at)}</span>
                </p>
                <p className="booking-card__row booking-card__row--muted">
                  <LuUsers aria-hidden="true" />
                  <span>
                    {booking.guest_count} {booking.guest_count === 1 ? "guest" : "guests"}
                  </span>
                </p>
              </div>
              <div className="booking-card__actions">
                <button
                  type="button"
                  className="booking-card__btn"
                  onClick={() => onModify(booking)}
                >
                  Modify
                </button>
                <button
                  type="button"
                  className="booking-card__btn booking-card__btn--danger"
                  onClick={() => onCancel(booking)}
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
