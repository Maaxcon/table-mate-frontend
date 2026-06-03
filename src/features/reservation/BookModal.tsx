import { useCallback, useMemo, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { WorkingHoursDay } from "./api"
import { checkAvailability, createReservation } from "./api"
import "./BookModal.css"

interface BookModalProps {
  table: Table
  workingHours: Record<string, WorkingHoursDay> | null
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
}

function generateTimeSlots(date: Date, dayConfig: WorkingHoursDay | undefined): string[] {
  if (!dayConfig) return []

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return { h, m }
  }

  const open = parseTime(dayConfig.open)
  const close = parseTime(dayConfig.close)

  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const slots: string[] = []
  let hour = open.h
  let minute = open.m

  const closeTotal = close.h * 60 + close.m
  const openTotal = open.h * 60 + open.m
  const overnight = closeTotal <= openTotal

  const endBase = overnight ? closeTotal + 24 * 60 : closeTotal

  while (hour * 60 + minute < endBase) {
    const hh = String(hour % 24).padStart(2, "0")
    const mm = String(minute).padStart(2, "0")
    const slotTotal = hour * 60 + minute

    if (!isToday || slotTotal > now.getHours() * 60 + now.getMinutes()) {
      slots.push(`${hh}:${mm}`)
    }

    minute += 30
    if (minute >= 60) {
      hour += 1
      minute = 0
    }
  }

  return slots
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

export function BookModal({
  table,
  workingHours,
  restaurantId,
  onClose,
  onSuccess,
}: BookModalProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [guestCount, setGuestCount] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dates = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [today])

  const dayName = DAY_NAMES[selectedDate.getDay()]
  const dayConfig = workingHours?.[dayName]

  const timeSlots = useMemo(
    () => generateTimeSlots(selectedDate, dayConfig),
    [selectedDate, dayConfig],
  )

  const endAt = useMemo(() => {
    if (!selectedTime) return ""
    const [h, m] = selectedTime.split(":").map(Number)
    const endH = h + 2
    return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }, [selectedTime])

  const handleConfirm = useCallback(async () => {
    if (!selectedTime) return
    setError(null)
    setSubmitting(true)

    try {
      const dateStr = selectedDate.toISOString().split("T")[0]
      const startAt = `${dateStr}T${selectedTime}:00`
      const endAtStr = `${dateStr}T${endAt}:00`

      const available = await checkAvailability(startAt, endAtStr, guestCount, restaurantId)
      const isAvailable = available.some((t) => t.public_id === table.public_id)

      if (!isAvailable) {
        setError("This table is no longer available at the selected time.")
        setSubmitting(false)
        return
      }

      await createReservation({
        table: table.public_id,
        guest_count: guestCount,
        start_at: startAt,
        end_at: endAtStr,
      })

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reservation")
    } finally {
      setSubmitting(false)
    }
  }, [selectedTime, selectedDate, endAt, guestCount, table.public_id, onSuccess])

  return (
    <div
      className="book-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      <div className="book-modal">
        <div className="book-modal__header">
          <h2 className="book-modal__title">BOOK TABLE {table.table_number}</h2>
          <button className="book-modal__close" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <div className="book-modal__body">
          <section className="book-modal__section">
            <h3 className="book-modal__section-title">DATE</h3>
            <div className="book-modal__dates">
              {dates.map((d) => {
                const isActive =
                  d.getFullYear() === selectedDate.getFullYear() &&
                  d.getMonth() === selectedDate.getMonth() &&
                  d.getDate() === selectedDate.getDate()
                const isToday =
                  d.getFullYear() === today.getFullYear() &&
                  d.getMonth() === today.getMonth() &&
                  d.getDate() === today.getDate()
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    className={[
                      "book-modal__date-btn",
                      isActive ? "book-modal__date-btn--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setSelectedDate(d)
                      setSelectedTime(null)
                    }}
                  >
                    <span className="book-modal__date-day">
                      {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                    </span>
                    <span className="book-modal__date-num">{d.getDate()}</span>
                    {isToday && <span className="book-modal__date-today">TODAY</span>}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="book-modal__section">
            <h3 className="book-modal__section-title">TIME</h3>
            {!dayConfig ? (
              <p className="book-modal__empty">Restaurant closed on this day</p>
            ) : timeSlots.length === 0 ? (
              <p className="book-modal__empty">No available slots</p>
            ) : (
              <div className="book-modal__times">
                {timeSlots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={[
                      "book-modal__time-btn",
                      selectedTime === t ? "book-modal__time-btn--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="book-modal__section">
            <h3 className="book-modal__section-title">GUESTS</h3>
            <div className="book-modal__guests">
              <button
                type="button"
                className="book-modal__guest-btn"
                onClick={() => setGuestCount((g) => Math.max(1, g - 1))}
                disabled={guestCount <= 1}
              >
                &minus;
              </button>
              <span className="book-modal__guest-count">{guestCount}</span>
              <button
                type="button"
                className="book-modal__guest-btn"
                onClick={() => setGuestCount((g) => Math.min(table.capacity, g + 1))}
                disabled={guestCount >= table.capacity}
              >
                +
              </button>
            </div>
          </section>

          {selectedTime && (
            <section className="book-modal__section book-modal__section--summary">
              <h3 className="book-modal__section-title">CONFIRMATION</h3>
              <div className="book-modal__summary">
                <div className="book-modal__summary-row">
                  <span>Table</span>
                  <span>#{table.table_number}</span>
                </div>
                <div className="book-modal__summary-row">
                  <span>Date</span>
                  <span>
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="book-modal__summary-row">
                  <span>Time</span>
                  <span>
                    {selectedTime} &ndash; {endAt}
                  </span>
                </div>
                <div className="book-modal__summary-row">
                  <span>Guests</span>
                  <span>{guestCount}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {error && <p className="book-modal__error">{error}</p>}

        <div className="book-modal__actions">
          <button
            className="book-modal__btn book-modal__btn--cancel"
            onClick={onClose}
            type="button"
          >
            CANCEL
          </button>
          <button
            className="book-modal__btn book-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={!selectedTime || submitting}
            type="button"
          >
            {submitting ? "BOOKING..." : "CONFIRM BOOKING"}
          </button>
        </div>
      </div>
    </div>
  )
}
