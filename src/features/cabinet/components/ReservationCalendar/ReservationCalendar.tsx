import { useMemo, useState } from "react"
import {
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuMapPin,
  LuTable2,
  LuUsers,
  LuReceipt,
  LuCreditCard,
} from "react-icons/lu"
import type { HistoryEntry, Reservation } from "../../types"
import "./ReservationCalendar.css"

type Props = {
  reservations: Reservation[]
  history: HistoryEntry[]
  loading?: boolean
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isFutureDate(date: Date, today: Date) {
  return (
    date.getFullYear() > today.getFullYear() ||
    (date.getFullYear() === today.getFullYear() && date.getMonth() > today.getMonth()) ||
    (date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() > today.getDate())
  )
}

function buildCalendarDays(
  cursor: Date,
  reservations: Reservation[],
  history: HistoryEntry[],
  hasHistory: boolean,
  today: Date,
) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const days: Array<{
    date: Date
    reservations: Reservation[]
    orders: HistoryEntry[]
  }> = []
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d)
    const dayRes = reservations.filter((r) => {
      const start = new Date(r.start_at)
      return isSameDay(start, date)
    })
    const dayOrders =
      hasHistory && !isFutureDate(date, today)
        ? history.filter((h) => isSameDay(new Date(h.date), date))
        : []
    days.push({ date, reservations: dayRes, orders: dayOrders })
  }
  return days
}

export function ReservationCalendar({ reservations, history, loading }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }, [])
  const hasHistory = history.length > 0

  const earliestHistoryMonth = useMemo(() => {
    if (!hasHistory) return null
    const dates = history.map((h) => new Date(h.date))
    const min = new Date(Math.min(...dates.map((d) => d.getTime())))
    return new Date(min.getFullYear(), min.getMonth(), 1)
  }, [hasHistory, history])

  const futureReservationMonths = useMemo(() => {
    const months = reservations
      .filter((r) => new Date(r.start_at) > today)
      .map((r) => {
        const d = new Date(r.start_at)
        return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      })
    if (months.length === 0) return []
    const unique = [...new Set(months)].sort()
    return unique
  }, [reservations, today])

  const maxAllowedDate = useMemo(() => {
    if (futureReservationMonths.length > 0) {
      return new Date(futureReservationMonths[futureReservationMonths.length - 1])
    }
    if (!hasHistory) {
      const d = new Date(today)
      d.setDate(d.getDate() + 14)
      return d
    }
    return new Date(today.getFullYear(), today.getMonth() + 2, 1)
  }, [futureReservationMonths, hasHistory, today])

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const calendarDays = useMemo(
    () => buildCalendarDays(cursor, reservations, history, hasHistory, today),
    [cursor, reservations, history, hasHistory, today],
  )

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const selectedData = useMemo(() => {
    if (!selectedDate) return null
    const day = calendarDays.find((d) => isSameDay(d.date, selectedDate))
    if (!day) return null
    return day
  }, [calendarDays, selectedDate])

  const curYear = cursor.getFullYear()
  const curMonth = cursor.getMonth()
  const monthStartDay = new Date(curYear, curMonth, 1).getDay()

  const isTodayDate = (date: Date) => isSameDay(date, today)
  const isSelected = (date: Date) => selectedDate && isSameDay(date, selectedDate)

  const canGoPrev =
    earliestHistoryMonth !== null &&
    (curYear > earliestHistoryMonth.getFullYear() ||
      (curYear === earliestHistoryMonth.getFullYear() &&
        curMonth > earliestHistoryMonth.getMonth()))

  const canGoNext =
    curYear < maxAllowedDate.getFullYear() ||
    (curYear === maxAllowedDate.getFullYear() && curMonth < maxAllowedDate.getMonth())

  const prevMonth = () => {
    if (canGoPrev) setCursor(new Date(curYear, curMonth - 1, 1))
  }
  const nextMonth = () => {
    if (canGoNext) setCursor(new Date(curYear, curMonth + 1, 1))
  }

  const isWithinTwoWeeks = (date: Date) => {
    const diff = date.getTime() - today.getTime()
    return diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000
  }

  return (
    <section className="cabinet-section" aria-labelledby="cabinet-calendar-title">
      <h2 className="cabinet-section__title" id="cabinet-calendar-title">
        <LuCalendar aria-hidden="true" />{" "}
        {hasHistory ? "Calendar & History" : "Upcoming Reservations"}
      </h2>

      <div className="rc">
        <div className="rc__header">
          <button
            type="button"
            className={`rc__nav${!canGoPrev ? " rc__nav--disabled" : ""}`}
            onClick={prevMonth}
            aria-label="Previous month"
            disabled={!canGoPrev}
          >
            <LuChevronLeft />
          </button>
          <span className="rc__title">
            {MONTH_NAMES[curMonth]} {curYear}
          </span>
          <button
            type="button"
            className={`rc__nav${!canGoNext ? " rc__nav--disabled" : ""}`}
            onClick={nextMonth}
            aria-label="Next month"
            disabled={!canGoNext}
          >
            <LuChevronRight />
          </button>
        </div>

        <div className="rc__day-names">
          {DAY_NAMES.map((name) => (
            <div key={name} className="rc__day-name">
              {name}
            </div>
          ))}
        </div>

        <div className="rc__grid">
          {Array.from({ length: monthStartDay }).map((_, i) => (
            <div key={`empty-${i}`} className="rc__cell rc__cell--empty" />
          ))}
          {calendarDays.map(({ date, reservations: dayRes, orders: dayOrders }) => {
            const isClickable = dayRes.length > 0 || dayOrders.length > 0
            const isWithinRange = hasHistory || isWithinTwoWeeks(date)
            const isPastAndHasHistory = hasHistory && !isFutureDate(date, today)
            const showDot = isPastAndHasHistory ? dayOrders.length > 0 : dayRes.length > 0

            return (
              <button
                key={date.toISOString()}
                type="button"
                className={[
                  "rc__cell",
                  isTodayDate(date) ? "rc__cell--today" : "",
                  isSelected(date) ? "rc__cell--selected" : "",
                  showDot ? "rc__cell--has-events" : "",
                  !isWithinRange || !isClickable ? "rc__cell--empty" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => isClickable && isWithinRange && setSelectedDate(date)}
                disabled={!isClickable || !isWithinRange}
              >
                <span className="rc__day">{date.getDate()}</span>
                {showDot && <span className="rc__dot" />}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && selectedData && (
        <div className="rc__details">
          <h3 className="rc__details-title">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          {loading ? (
            <p className="cabinet-section__loading">Loading...</p>
          ) : selectedData.orders.length > 0 ? (
            <div className="rc__order-list">
              {selectedData.orders.map((o) => (
                <div key={o.id} className="rc__item">
                  <div className="rc__item-header">
                    <LuReceipt aria-hidden="true" />
                    <span className="rc__order-number">{o.orderNumber}</span>
                    <span className={`rc__payment rc__payment--${o.paymentMethod}`}>
                      <LuCreditCard aria-hidden="true" />{" "}
                      {o.paymentMethod === "card" ? "Card" : "Cash"}
                    </span>
                  </div>
                  <div className="rc__item-row">
                    <LuMapPin aria-hidden="true" />
                    {o.restaurantName}
                  </div>
                  <div className="rc__item-row">
                    <LuTable2 aria-hidden="true" />
                    {o.tableLabel}
                  </div>
                  <div className="rc__item-row">
                    <LuUsers aria-hidden="true" />
                    {o.guests} {o.guests === 1 ? "guest" : "guests"}
                  </div>
                  <ul className="rc__order-items">
                    {o.items.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="rc__order-item">
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                      </li>
                    ))}
                    {o.items.length > 3 && (
                      <li className="rc__order-item rc__order-item--more">
                        +{o.items.length - 3} more items
                      </li>
                    )}
                  </ul>
                  <div className="rc__item-row rc__item-row--total">
                    <span>Total</span>
                    <span>
                      {o.currency} {o.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedData.reservations.length > 0 ? (
            <ul className="rc__list">
              {selectedData.reservations.map((r) => (
                <li key={r.public_id} className="rc__item">
                  <span className={`booking-card__status booking-card__status--${r.status}`}>
                    {r.status}
                  </span>
                  <span className="rc__item-row">
                    <LuMapPin aria-hidden="true" />
                    {r.restaurant_info?.name ?? "Restaurant"}
                  </span>
                  <span className="rc__item-row">
                    <LuTable2 aria-hidden="true" />
                    Table {r.table_info?.public_number ?? r.table ?? "—"}
                  </span>
                  <span className="rc__item-row">
                    <LuClock aria-hidden="true" />
                    {new Date(r.start_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" — "}
                    {new Date(r.end_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="rc__item-row rc__item-row--muted">
                    <LuUsers aria-hidden="true" />
                    {r.guest_count} {r.guest_count === 1 ? "guest" : "guests"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cabinet-section__empty">No reservations or orders on this day.</p>
          )}
        </div>
      )}
    </section>
  )
}
