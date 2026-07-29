import { useState } from "react"
import { LuCalendarClock, LuMapPin, LuTable2, LuUsers } from "react-icons/lu"
import { useNavigate } from "react-router-dom"
import { cancelPreorder, fetchPreorder } from "@/features/cabinet/api"
import { useCabinetStrings } from "@/features/cabinet/strings"
import type { Preorder, Reservation } from "@/features/cabinet/types"
import { formatAmount, getCurrencySymbol } from "@/features/menu/utils"
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

  // Keyed by reservation public_id. undefined = not fetched yet, null =
  // fetched and there's none (including just-cancelled — cancelling sets it
  // to null locally instead of re-fetching).
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [preorders, setPreorders] = useState<Record<string, Preorder | null>>({})
  const [preorderLoadingId, setPreorderLoadingId] = useState<string | null>(null)
  const [preorderErrors, setPreorderErrors] = useState<Record<string, string>>({})
  const [cancellingPreorderId, setCancellingPreorderId] = useState<string | null>(null)

  const toggleExpand = (bookingId: string) => {
    if (expandedId === bookingId) {
      setExpandedId(null)
      return
    }
    setExpandedId(bookingId)
    if (preorders[bookingId] !== undefined) return
    setPreorderLoadingId(bookingId)
    fetchPreorder(bookingId)
      .then((p) => setPreorders((prev) => ({ ...prev, [bookingId]: p })))
      .catch(() =>
        setPreorderErrors((prev) => ({ ...prev, [bookingId]: strings.bookings.preorderLoadError })),
      )
      .finally(() => setPreorderLoadingId(null))
  }

  const handleCancelPreorder = async (bookingId: string) => {
    setCancellingPreorderId(bookingId)
    setPreorderErrors((prev) => ({ ...prev, [bookingId]: "" }))
    try {
      await cancelPreorder(bookingId)
      setPreorders((prev) => ({ ...prev, [bookingId]: null }))
    } catch {
      setPreorderErrors((prev) => ({ ...prev, [bookingId]: strings.bookings.preorderCancelError }))
    } finally {
      setCancellingPreorderId(null)
    }
  }

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

              const preorder = preorders[booking.public_id]
              // Badge/panel stay visible until we've confirmed (via GET or a
              // successful cancel) that there's nothing to show anymore.
              const showsPreorder = booking.has_preorder && preorder !== null
              const isExpanded = expandedId === booking.public_id
              const preorderLoading = preorderLoadingId === booking.public_id
              const preorderError = preorderErrors[booking.public_id]
              const cancellingThis = cancellingPreorderId === booking.public_id

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
                  </div>

                  {showsPreorder && (
                    <div className="booking-card__preorder">
                      <button
                        type="button"
                        className="booking-card__preorder-toggle"
                        onClick={() => toggleExpand(booking.public_id)}
                      >
                        {isExpanded ? strings.bookings.preorderHide : strings.bookings.preorderShow}
                      </button>
                      {isExpanded && (
                        <div className="booking-card__preorder-panel">
                          {preorderLoading ? (
                            <p className="booking-card__preorder-hint">
                              {strings.bookings.preorderLoading}
                            </p>
                          ) : preorderError ? (
                            <p className="booking-card__preorder-error">{preorderError}</p>
                          ) : preorder ? (
                            <>
                              <ul className="booking-card__preorder-items">
                                {preorder.items.map((item, i) => (
                                  <li key={i} className="booking-card__preorder-item">
                                    <span>
                                      {item.name} × {item.quantity}
                                    </span>
                                    <span>
                                      {formatAmount(item.totalPrice)}{" "}
                                      {getCurrencySymbol(preorder.currency)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <p className="booking-card__preorder-total">
                                {strings.bookings.preorderTotal(
                                  `${formatAmount(preorder.total)} ${getCurrencySymbol(preorder.currency)}`,
                                )}
                              </p>
                              {preorder.canCancel ? (
                                <button
                                  type="button"
                                  className="booking-card__btn booking-card__btn--danger"
                                  onClick={() => void handleCancelPreorder(booking.public_id)}
                                  disabled={cancellingThis}
                                >
                                  {cancellingThis
                                    ? strings.bookings.preorderCancelling
                                    : strings.bookings.preorderCancel}
                                </button>
                              ) : (
                                <p className="booking-card__preorder-hint">
                                  {strings.bookings.preorderLocked}
                                </p>
                              )}
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}

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
    </section>
  )
}
