import { useCallback, useEffect, useMemo, useState } from "react"
import type { WorkingHoursDay } from "./api"
import { fetchAvailableSlots, fetchRestaurantSettings, modifyReservation } from "./api"
import {
  DAY_NAMES,
  generateTimeSlots,
  localDateKey,
  MIN_DURATION,
  minutesToTime,
  timeToMinutes,
} from "./utils"
import "./BookModal.css"

interface RescheduleModalProps {
  publicId: string
  tableNumber: string
  tablePublicId: string
  currentDate: string
  currentStart: string
  currentEnd: string
  currentGuests: number
  tableCapacity: number
  restaurantId?: string
  workingHours: Record<string, WorkingHoursDay> | null
  excludeReservationIds?: string[]
  prolongOnly?: boolean
  endTimeOnly?: boolean
  onClose: () => void
  onSuccess: () => void
}

function msToTime(ms: number): string {
  const d = new Date(ms)
  const h = d.getHours()
  const m = d.getMinutes()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function RescheduleModal({
  publicId,
  tableNumber,
  tablePublicId,
  currentDate,
  currentStart,
  currentEnd,
  currentGuests,
  tableCapacity,
  restaurantId,
  workingHours,
  excludeReservationIds,
  prolongOnly = false,
  endTimeOnly = false,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const [internalWorkingHours, setInternalWorkingHours] = useState<Record<
    string,
    WorkingHoursDay
  > | null>(null)

  useEffect(() => {
    if (!workingHours && restaurantId) {
      fetchRestaurantSettings(restaurantId)
        .then((settings) => setInternalWorkingHours(settings.working_hours))
        .catch(() => setInternalWorkingHours(null))
    }
  }, [workingHours, restaurantId])

  const currentStartTime = msToTime(new Date(currentStart).getTime())
  const currentEndTime = msToTime(new Date(currentEnd).getTime())
  const currentDurationMinutes = timeToMinutes(currentEndTime) - timeToMinutes(currentStartTime)

  const parsedDate = useMemo(() => new Date(currentDate), [currentDate])

  const initialSnappedTime = useMemo(() => {
    const mins = timeToMinutes(currentStartTime)
    const snapped = Math.round(mins / 30) * 30
    return minutesToTime(snapped)
  }, [currentStartTime])

  const [selectedTime, setSelectedTime] = useState<string | null>(
    prolongOnly ? currentStartTime : initialSnappedTime,
  )
  const [durationMinutes, setDurationMinutes] = useState(
    Math.max(MIN_DURATION, currentDurationMinutes),
  )
  const [guestCount, setGuestCount] = useState(currentGuests)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [availableSlots, setAvailableSlots] = useState<string[] | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(true)

  const dateStr = localDateKey(parsedDate)

  useEffect(() => {
    const excludeIds =
      excludeReservationIds && excludeReservationIds.length > 0 ? excludeReservationIds : publicId
    fetchAvailableSlots(tablePublicId, dateStr, excludeIds)
      .then((data) => setAvailableSlots(data[dateStr] ?? null))
      .catch(() => setAvailableSlots(null))
      .finally(() => setSlotsLoading(false))
  }, [tablePublicId, dateStr, publicId, excludeReservationIds])

  const dayName = DAY_NAMES[parsedDate.getDay()]
  const dayConfig = workingHours?.[dayName] || internalWorkingHours?.[dayName]

  const timeSlots = useMemo(() => {
    if (availableSlots) return availableSlots
    return generateTimeSlots(parsedDate, dayConfig)
  }, [availableSlots, parsedDate, dayConfig])

  const endAt = useMemo(() => {
    if (!selectedTime) return ""
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

    if (availableSlots && !endTimeOnly) {
      const startMins = prolongOnly ? timeToMinutes(currentEndTime) : timeToMinutes(selectedTime)
      for (let m = startMins; m < endMins; m += 30) {
        const slotTime = minutesToTime(m)
        if (!availableSlots.includes(slotTime)) {
          return "The selected duration is not fully available at this time. Choose a shorter duration or different start time."
        }
      }
    }

    return null
  }, [
    selectedTime,
    durationMinutes,
    dayConfig,
    availableSlots,
    prolongOnly,
    currentEndTime,
    endTimeOnly,
  ])

  const handleSave = useCallback(async () => {
    if (!selectedTime) return
    setError(null)
    setSubmitting(true)

    try {
      const startDt = new Date(`${dateStr}T${selectedTime}:00`)
      const endDt = new Date(startDt.getTime() + durationMinutes * 60000)
      const startISO = startDt.toISOString()
      const endISO = endDt.toISOString()

      if (endTimeOnly) {
        await modifyReservation(publicId, { end_at: endISO })
      } else {
        await modifyReservation(publicId, {
          start_at: startISO,
          end_at: endISO,
          guest_count: guestCount,
        })
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to modify reservation")
    } finally {
      setSubmitting(false)
    }
  }, [selectedTime, dateStr, endAt, guestCount, publicId, endTimeOnly])

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
            <h2 className="book-modal__title">RESERVATION UPDATED</h2>
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
              Your reservation at Table {tableNumber} has been updated.
            </p>
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
          <h2 className="book-modal__title">RESCHEDULE TABLE {tableNumber}</h2>
          <button className="book-modal__close" onClick={onClose} type="button">
            &times;
          </button>
        </div>

        <div className="book-modal__body">
          <section className="book-modal__section">
            <h3 className="book-modal__section-title">DATE</h3>
            <p className="book-modal__empty">
              {parsedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </section>

          <section className="book-modal__section">
            <h3 className="book-modal__section-title">TIME</h3>
            {prolongOnly || endTimeOnly ? (
              <p className="book-modal__empty">Starting from {currentStartTime}</p>
            ) : slotsLoading ? (
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
                onClick={() => setGuestCount((g) => g + 1)}
                disabled={guestCount >= tableCapacity}
              >
                +
              </button>
            </div>
          </section>

          {selectedTime && (
            <section className="book-modal__section book-modal__section--summary">
              <h3 className="book-modal__section-title">SUMMARY</h3>
              <div className="book-modal__summary">
                <div className="book-modal__summary-row">
                  <span>Table</span>
                  <span>#{tableNumber}</span>
                </div>
                <div className="book-modal__summary-row">
                  <span>Date</span>
                  <span>
                    {parsedDate.toLocaleDateString("en-US", {
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
            onClick={handleSave}
            disabled={!selectedTime || submitting || !!durationError}
            type="button"
          >
            {submitting ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  )
}
