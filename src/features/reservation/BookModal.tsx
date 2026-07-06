import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { WorkingHoursDay, ReservationWithTable } from "./api"
import {
  checkAvailability,
  createReservation,
  fetchAvailableSlots,
  fetchRestaurantSettings,
} from "./api"
import {
  DAY_NAMES,
  generateTimeSlots,
  localDateKey,
  MIN_DURATION,
  minutesToTime,
  timeToMinutes,
  normalizeSlots,
} from "./utils"
import "./BookModal.css"

interface BookTable {
  public_id: string
  public_number: string
  capacity: number
}

interface BookModalProps {
  table: BookTable
  workingHours: Record<string, WorkingHoursDay> | null
  restaurantId: string
  onClose: () => void
  onSuccess: (data?: ReservationWithTable) => void
  showNameField?: boolean
}

export function BookModal({
  table,
  workingHours,
  restaurantId,
  onClose,
  onSuccess,
  showNameField,
}: BookModalProps) {
  const reservationRef = useRef<ReservationWithTable | null>(null)
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [guestCount, setGuestCount] = useState(2)
  const [guestName, setGuestName] = useState("")
  const [notes, setNotes] = useState("")
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

  const [fallbackWorkingHours, setFallbackWorkingHours] = useState<Record<
    string,
    WorkingHoursDay
  > | null>(null)
  const [fallbackResolved, setFallbackResolved] = useState(false)

  const needsFallback = workingHours === null && !!restaurantId
  const fallbackHoursLoading = needsFallback && !fallbackResolved
  const effectiveWorkingHours = workingHours ?? fallbackWorkingHours

  useEffect(() => {
    if (workingHours !== null || !restaurantId) return
    fetchRestaurantSettings(restaurantId)
      .then((settings) => {
        setFallbackWorkingHours(settings.working_hours)
        setFallbackResolved(true)
      })
      .catch(() => {
        setFallbackWorkingHours(null)
        setFallbackResolved(true)
      })
  }, [workingHours, restaurantId])

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
  const dayConfig = effectiveWorkingHours?.[dayName]

  const dateKey = localDateKey(selectedDate)

  const realSlots = useMemo(() => {
    if (!availableSlots) return null
    const raw = availableSlots[dateKey]
    if (!raw) return null
    return normalizeSlots(raw)
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

    if (realSlots) {
      const startMins = timeToMinutes(selectedTime)
      for (let m = startMins; m < endMins; m += 30) {
        const slotTime = minutesToTime(m)
        if (!realSlots.includes(slotTime)) {
          return "The selected duration is not fully available at this time. Choose a shorter duration or different start time."
        }
      }
    }

    return null
  }, [selectedTime, durationMinutes, dayConfig, realSlots])

  const handleConfirm = useCallback(async () => {
    if (!selectedTime) return
    setError(null)
    setSubmitting(true)

    try {
      const startDt = new Date(`${localDateKey(selectedDate)}T${selectedTime}:00`)
      const endDt = new Date(startDt.getTime() + durationMinutes * 60000)
      const startISO = startDt.toISOString()
      const endISO = endDt.toISOString()

      const available = await checkAvailability(startISO, endISO, guestCount, restaurantId)
      const isAvailable = available.some((t) => t.public_id === table.public_id)

      if (!isAvailable) {
        setError(
          "This table is not available for the selected time. Please choose a different time or date.",
        )
        setSubmitting(false)
        return
      }

      const body: Record<string, unknown> = {
        table: table.public_id,
        guest_count: guestCount,
        start_at: startISO,
        end_at: endISO,
        notes: notes || undefined,
      }
      if (showNameField && guestName) {
        body.guest_name = guestName
      }
      reservationRef.current = await createReservation(
        body as Parameters<typeof createReservation>[0],
      )

      setSuccess({
        tableNumber: table.public_number,
        date: localDateKey(selectedDate),
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
    durationMinutes,
    endAt,
    guestCount,
    guestName,
    notes,
    showNameField,
    restaurantId,
    table.public_id,
    table.public_number,
  ])

  const dismissWithSuccess = useCallback(() => {
    onSuccess(reservationRef.current ?? undefined)
    onClose()
  }, [onSuccess, onClose])

  if (success) {
    return (
      <div
        className="book-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) dismissWithSuccess()
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape") dismissWithSuccess()
        }}
      >
        <div className="book-modal">
          <div className="book-modal__header">
            <h2 className="book-modal__title">BOOKING CONFIRMED</h2>
            <button className="book-modal__close" onClick={dismissWithSuccess} type="button">
              &times;
            </button>
          </div>
          <div className="book-modal__body">
            <div className="book-modal__success-icon">&#10003;</div>
            <p className="book-modal__success-text">
              {showNameField
                ? `Reservation for Table ${success.tableNumber} has been created.`
                : `Your reservation at Table ${success.tableNumber} has been created.`}
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
              onClick={dismissWithSuccess}
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
          <h2 className="book-modal__title">BOOK TABLE {table.public_number}</h2>
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
            {slotsLoading || fallbackHoursLoading ? (
              <p className="book-modal__empty">Loading available slots…</p>
            ) : timeSlots.length === 0 ? (
              <p className="book-modal__empty">
                {!realSlots && !dayConfig ? "Restaurant closed on this day" : "No available slots"}
              </p>
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

          {showNameField && (
            <section className="book-modal__section">
              <h3 className="book-modal__section-title">GUEST NAME</h3>
              <input
                type="text"
                className="book-modal__notes"
                placeholder="Guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </section>
          )}

          <section className="book-modal__section">
            <h3 className="book-modal__section-title">NOTES (optional)</h3>
            <textarea
              className="book-modal__notes"
              placeholder="Special requests..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </section>

          {selectedTime && (
            <section className="book-modal__section book-modal__section--summary">
              <h3 className="book-modal__section-title">CONFIRMATION</h3>
              <div className="book-modal__summary">
                <div className="book-modal__summary-row">
                  <span>Table</span>
                  <span>#{table.public_number}</span>
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
