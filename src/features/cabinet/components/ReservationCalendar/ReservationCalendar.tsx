import { useMemo, useState } from "react"
import {
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuMapPin,
  LuTable2,
  LuUsers,
} from "react-icons/lu"
import type { Reservation } from "../../types"
import "./ReservationCalendar.css"

type Props = {
  reservations: Reservation[]
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

function buildCalendarDays(cursor: Date, reservations: Reservation[]) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const days: Array<{ date: Date; reservations: Reservation[] }> = []
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d)
    const dayRes = reservations.filter((r) => {
      const start = new Date(r.start_at)
      return isSameDay(start, date)
    })
    days.push({ date, reservations: dayRes })
  }
  return days
}

export function ReservationCalendar({ reservations, loading }: Props) {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const calendarDays = useMemo(
    () => buildCalendarDays(cursor, reservations),
    [cursor, reservations],
  )

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const selectedReservations = useMemo(
    () =>
      calendarDays.find((d) => selectedDate && isSameDay(d.date, selectedDate))?.reservations ?? [],
    [calendarDays, selectedDate],
  )

  const curYear = cursor.getFullYear()
  const curMonth = cursor.getMonth()
  const monthStartDay = new Date(curYear, curMonth, 1).getDay()
  const prevMonth = () => setCursor(new Date(curYear, curMonth - 1, 1))
  const nextMonth = () => setCursor(new Date(curYear, curMonth + 1, 1))

  const isToday = (date: Date) => isSameDay(date, today)
  const isSelected = (date: Date) => selectedDate && isSameDay(date, selectedDate)

  return (
    <section className="cabinet-section" aria-labelledby="cabinet-calendar-title">
      <h2 className="cabinet-section__title" id="cabinet-calendar-title">
        <LuCalendar aria-hidden="true" /> Calendar
      </h2>

      <div className="rc">
        <div className="rc__header">
          <button type="button" className="rc__nav" onClick={prevMonth} aria-label="Previous month">
            <LuChevronLeft />
          </button>
          <span className="rc__title">
            {MONTH_NAMES[curMonth]} {curYear}
          </span>
          <button type="button" className="rc__nav" onClick={nextMonth} aria-label="Next month">
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
          {calendarDays.map(({ date, reservations: dayRes }) => (
            <button
              key={date.toISOString()}
              type="button"
              className={[
                "rc__cell",
                isToday(date) ? "rc__cell--today" : "",
                isSelected(date) ? "rc__cell--selected" : "",
                dayRes.length > 0 ? "rc__cell--has-events" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSelectedDate(date)}
            >
              <span className="rc__day">{date.getDate()}</span>
              {dayRes.length > 0 && <span className="rc__dot" />}
            </button>
          ))}
        </div>
      </div>

      {selectedDate && (
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
          ) : selectedReservations.length === 0 ? (
            <p className="cabinet-section__empty">No reservations on this day.</p>
          ) : (
            <ul className="rc__list">
              {selectedReservations.map((r) => (
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
                    Table {r.table_info?.table_number ?? r.table ?? "—"}
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
          )}
        </div>
      )}
    </section>
  )
}
