import { useCallback, useEffect, useMemo, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { WorkingHoursDay } from "./api"
import { checkAvailability, createReservation, fetchAvailableSlots } from "./api"
import "./BookModal.css"

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

interface BookModalProps {
  table: Table
  workingHours: Record<string, WorkingHoursDay> | null
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
}

const MIN_DURATION = 30
const MAX_DURATION = 480

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
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [guestCount, setGuestCount] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    tableNumber: string
    date: string
    time: string
    endTime: string
    guests: number
  } | null>(null)

  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]> | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(true)

  useEffect(() => {
    fetchAvailableSlots(table.public_id)
      .then((data) => setAvailableSlots(data))
      .catch(() => setAvailableSlots({}))
      .finally(() => setSlotsLoading(false))
  }, [table.public_id])

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

  const dateKey = localDateKey(selectedDate)

  const realSlots = useMemo(() => {
    if (!availableSlots) return null
    return availableSlots[dateKey] ?? null
  }, [availableSlots, dateKey])

  const timeSlots = useMemo(() => {
    if (realSlots) return realSlots
    return generateTimeSlots(selectedDate, dayConfig)
  }, [realSlots, selectedDate, dayConfig])

  const endAt = useMemo(() => {
    if (!selectedTime || !durationMinutes) return ""
    return minutesToTime(timeToMinutes(selectedTime) + durationMinutes)
  }, [selectedTime, durationMinutes])

  const durationError = useMemo(() => {
    if (!selectedTime || !durationMinutes) return null

    const endMins = timeToMinutes(selectedTime) + durationMinutes

    if (dayConfig) {
      const closeMins = timeToMinutes(dayConfig.close)
      const openMins = timeToMinutes(dayConfig.open)
      const overnight = closeMins <= openMins
      if (!overnight && endMins > closeMins) {
        return `End time exceeds closing time (${dayConfig.close})`
      }
    }

    if (availableSlots) {
      const slots = availableSlots[dateKey]
      if (slots) {
        const startMins = timeToMinutes(selectedTime)
        for (let m = startMins; m < endMins; m += 30) {
          const slotTime = minutesToTime(m)
          if (!slots.includes(slotTime)) {
            return "The selected duration is not fully available at this time. Choose a shorter duration or different start time."
          }
        }
      }
    }

    return null
  }, [selectedTime, durationMinutes, dayConfig, availableSlots, dateKey])

  const handleConfirm = useCallback(async () => {
    if (!selectedTime) return
    setError(null)
    setSubmitting(true)

    try {
      const dateStr = localDateKey(selectedDate)
      const startISO = new Date(`${dateStr}T${selectedTime}:00`).toISOString()
      const endISO = new Date(`${dateStr}T${endAt}:00`).toISOString()

      const available = await checkAvailability(startISO, endISO, guestCount, restaurantId)
      const isAvailable = available.some((t) => t.public_id === table.public_id)

      if (!isAvailable) {
        setError(
          "This table is not available for the selected time. Please choose a different time or date.",
        )
        setSubmitting(false)
        return
      }

      await createReservation({
        table: table.public_id,
        guest_count: guestCount,
        start_at: startISO,
        end_at: endISO,
      })

      setSuccess({
        tableNumber: table.table_number,
        date: dateStr,
        time: selectedTime,
        endTime: endAt,
        guests: guestCount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reservation")
    } finally {
      setSubmitting(false)
    }
  }, [
    selectedTime,
    selectedDate,
    endAt,
    guestCount,
    restaurantId,
    table.public_id,
    table.table_number,
  ])

  if (success) {
    return (
      <div
        className="book-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSuccess()
            onClose()
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onSuccess()
            onClose()
          }
        }}
      >
        <div className="book-modal">
          <div className="book-modal__header">
            <h2 className="book-modal__title">BOOKING CONFIRMED</h2>
            <button
              className="book-modal__close"
              onClick={() => {
                onSuccess()
                onClose()
              }}
              type="button"
            >
              &times;
            </button>
          </div>
          <div className="book-modal__body">
            <div className="book-modal__success-icon">&#10003;</div>
            <p className="book-modal__success-text">
              Your reservation at Table {success.tableNumber} has been created.
            </p>
            <div className="book-modal__summary">
              <div className="book-modal__summary-row">
                <span>Date</span>
                <span>{success.date}</span>
              </div>
              <div className="book-modal__summary-row">
                <span>Time</span>
                <span>
                  {success.time} &ndash; {success.endTime}
                </span>
              </div>
              <div className="book-modal__summary-row">
                <span>Guests</span>
                <span>{success.guests}</span>
              </div>
            </div>
          </div>
          <div className="book-modal__actions">
            <button
              className="book-modal__btn book-modal__btn--confirm"
              onClick={() => {
                onSuccess()
                onClose()
              }}
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )
  }

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
                const dKey = localDateKey(d)
                const hasSlots = availableSlots ? (availableSlots[dKey]?.length ?? 0) > 0 : true
                const isGrayed = availableSlots !== null && !hasSlots
                return (
                  <button
                    key={dKey}
                    type="button"
                    className={[
                      "book-modal__date-btn",
                      isActive ? "book-modal__date-btn--active" : "",
                      isGrayed ? "book-modal__date-btn--grayed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      if (!isGrayed) {
                        setSelectedDate(d)
                        setSelectedTime(null)
                      }
                    }}
                    disabled={isGrayed}
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
            {slotsLoading ? (
              <p className="book-modal__empty">Loading available slots…</p>
            ) : !dayConfig ? (
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
            <h3 className="book-modal__section-title">DURATION (minutes)</h3>
            <div className="book-modal__duration-input">
              <input
                type="number"
                className="book-modal__duration-field"
                min={MIN_DURATION}
                max={MAX_DURATION}
                step={15}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(MIN_DURATION, Number(e.target.value)))}
              />
              {durationError && <p className="book-modal__hint">{durationError}</p>}
            </div>
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
                  <span>Duration</span>
                  <span>{durationMinutes} min</span>
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
            disabled={!selectedTime || submitting || !!durationError}
            type="button"
          >
            {submitting ? "BOOKING..." : "CONFIRM BOOKING"}
          </button>
        </div>
      </div>
    </div>
  )
}
