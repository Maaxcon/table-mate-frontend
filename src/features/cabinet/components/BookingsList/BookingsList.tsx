import { LuCalendarClock, LuMapPin, LuTable2, LuUsers } from "react-icons/lu"
import type { Reservation } from "../../types"
import "./BookingsList.css"

type BookingsListProps = {
  bookings: Reservation[]
  error: string | null
  hasMore: boolean
  actionId: string | null
  onModify: (booking: Reservation) => void
  onCancel: (booking: Reservation) => void
  onLoadMore: () => void
}

function formatBookingTime(startAt: string, endAt: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  return {
    date: start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")} - ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
  }
}

export function BookingsList({
  bookings,
  error,
  hasMore,
  actionId,
  onModify,
  onCancel,
  onLoadMore,
}: BookingsListProps) {
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
        <>
          <ul className="cabinet-bookings">
            {bookings.map((booking) => {
              const dateTime = formatBookingTime(booking.start_at, booking.end_at)
              const tableNumber = booking.table_info?.table_number ?? booking.table ?? "Unknown"
              const restaurantName = booking.restaurant_info?.name ?? "Restaurant"
              const isBusy = actionId === booking.public_id

              return (
                <li key={booking.public_id} className="booking-card">
                  <div className="booking-card__main">
                    <div className="booking-card__header">
                      <span
                        className={`booking-card__status booking-card__status--${booking.status}`}
                      >
                        {booking.status}
                      </span>
                      <span className="booking-card__restaurant">
                        <LuMapPin aria-hidden="true" />
                        {restaurantName}
                      </span>
                    </div>
                    <p className="booking-card__row">
                      <LuTable2 aria-hidden="true" />
                      <span>Table {tableNumber}</span>
                    </p>
                    <p className="booking-card__row">
                      <LuCalendarClock aria-hidden="true" />
                      <span>
                        {dateTime.date}, {dateTime.time}
                      </span>
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
                      disabled={isBusy}
                    >
                      Modify
                    </button>
                    <button
                      type="button"
                      className="booking-card__btn booking-card__btn--danger"
                      onClick={() => onCancel(booking)}
                      disabled={isBusy}
                    >
                      {isBusy ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {hasMore && (
            <button type="button" className="cabinet-bookings__more" onClick={onLoadMore}>
              Load More
            </button>
          )}
        </>
      )}
    </section>
  )
}
