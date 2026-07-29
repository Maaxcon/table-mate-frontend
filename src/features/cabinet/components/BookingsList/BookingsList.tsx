import { useState } from "react"
import { LuCalendarClock, LuMapPin, LuTable2, LuUsers, LuUtensilsCrossed } from "react-icons/lu"
import { useNavigate } from "react-router-dom"
import { useCabinetStrings } from "@/features/cabinet/strings"
import type { Reservation } from "@/features/cabinet/types"
import { PreorderDialog } from "@/features/cabinet/components/PreorderDialog/PreorderDialog"
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

function formatBookingTime(startAt: string, endAt: string, locale: string) {
  const start = new Date(startAt)
  const end = new Date(endAt)
  return {
    date: start.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: `${start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`,
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
  const strings = useCabinetStrings()
  const navigate = useNavigate()

  const [viewingPreorder, setViewingPreorder] = useState<Reservation | null>(null)
  // Bookings whose pre-order was just cancelled — hides the entry point
  // without needing to re-fetch the whole booking list.
  const [cancelledPreorderIds, setCancelledPreorderIds] = useState<Set<string>>(new Set())

  return (
    <section className="cabinet-section" aria-labelledby="cabinet-bookings-title">
      <h2 className="cabinet-section__title" id="cabinet-bookings-title">
        {strings.bookings.title}
      </h2>

      {error ? (
        <p className="cabinet-section__empty cabinet-section__empty--error">{error}</p>
      ) : bookings.length === 0 ? (
        <p className="cabinet-section__empty">{strings.bookings.empty}</p>
      ) : (
        <>
          <ul className="cabinet-bookings">
            {bookings.map((booking) => {
              const dateTime = formatBookingTime(booking.start_at, booking.end_at, strings.locale)
              const tableNumber =
                booking.table_info?.public_number ?? booking.table ?? strings.bookings.unknownTable
              const restaurantName =
                booking.restaurant_info?.name ?? strings.bookings.fallbackRestaurant
              const isBusy = actionId === booking.public_id
              const showsPreorder =
                booking.has_preorder && !cancelledPreorderIds.has(booking.public_id)

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
                      <span>{strings.bookings.tableLabel(tableNumber)}</span>
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
                        {booking.guest_count} {strings.bookings.guestLabel(booking.guest_count)}
                      </span>
                    </p>
                    {showsPreorder && (
                      <button
                        type="button"
                        className="booking-card__preorder-toggle"
                        onClick={() => setViewingPreorder(booking)}
                      >
                        <LuUtensilsCrossed aria-hidden="true" />
                        {strings.bookings.preorderShow}
                      </button>
                    )}
                  </div>

                  {booking.status === "active" ? (
                    <p className="booking-card__row booking-card__row--muted">
                      {strings.bookings.activeNote}
                    </p>
                  ) : (
                    <div className="booking-card__actions">
                      {booking.status === "pending" && (
                        <button
                          type="button"
                          className="booking-card__btn booking-card__btn--preorder"
                          onClick={() =>
                            navigate(`/menu/${booking.restaurant}?reservation=${booking.public_id}`)
                          }
                          disabled={isBusy}
                        >
                          {strings.bookings.preorder}
                        </button>
                      )}
                      <button
                        type="button"
                        className="booking-card__btn"
                        onClick={() => onModify(booking)}
                        disabled={isBusy}
                      >
                        {strings.bookings.modify}
                      </button>
                      <button
                        type="button"
                        className="booking-card__btn booking-card__btn--danger"
                        onClick={() => onCancel(booking)}
                        disabled={isBusy}
                      >
                        {isBusy ? strings.bookings.cancelling : strings.bookings.cancel}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {hasMore && (
            <button type="button" className="cabinet-bookings__more" onClick={onLoadMore}>
              {strings.bookings.loadMore}
            </button>
          )}
        </>
      )}

      {viewingPreorder && (
        <PreorderDialog
          booking={viewingPreorder}
          onClose={() => setViewingPreorder(null)}
          onCancelled={() =>
            setCancelledPreorderIds((prev) => new Set(prev).add(viewingPreorder.public_id))
          }
        />
      )}
    </section>
  )
}
