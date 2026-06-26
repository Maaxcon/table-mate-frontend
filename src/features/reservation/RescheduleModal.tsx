import { useCallback, useEffect, useMemo, useState } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { WorkingHoursDay } from "./api"
import { fetchAvailableSlots, fetchRestaurantSettings, modifyReservation } from "./api"
import { bookStrings } from "./strings"
import {
  DAY_NAMES,
  generateTimeSlots,
  localDateKey,
  MIN_DURATION,
  minutesToTime,
  timeToMinutes,
  zonedWallTimeToUtcIso,
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
  timeZone?: string | null
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
  timeZone,
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
  const [internalTimeZone, setInternalTimeZone] = useState<string | null>(null)

  useEffect(() => {
    if (!workingHours && restaurantId) {
      fetchRestaurantSettings(restaurantId)
        .then((settings) => {
          setInternalWorkingHours(settings.working_hours)
          setInternalTimeZone(settings.timezone)
        })
        .catch(() => {
          setInternalWorkingHours(null)
          setInternalTimeZone(null)
        })
    }
  }, [workingHours, restaurantId])

  const effectiveTimeZone = timeZone ?? internalTimeZone

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
        return bookStrings.modal.validation.closingExceeded(dayConfig.close)
      }
    }

    if (availableSlots && !endTimeOnly) {
      const startMins = prolongOnly ? timeToMinutes(currentEndTime) : timeToMinutes(selectedTime)
      for (let m = startMins; m < endMins; m += 30) {
        const slotTime = minutesToTime(m)
        if (!availableSlots.includes(slotTime)) {
          return bookStrings.modal.validation.durationUnavailable
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
      // Interpret the picked slot in the restaurant timezone, not the browser's.
      const startISO = effectiveTimeZone
        ? zonedWallTimeToUtcIso(dateStr, selectedTime, effectiveTimeZone)
        : new Date(`${dateStr}T${selectedTime}:00`).toISOString()
      const endISO = new Date(new Date(startISO).getTime() + durationMinutes * 60000).toISOString()

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
      setError(err instanceof Error ? err.message : bookStrings.reschedule.modifyFailed)
    } finally {
      setSubmitting(false)
    }
  }, [selectedTime, dateStr, durationMinutes, guestCount, publicId, endTimeOnly, effectiveTimeZone])

  const handleDismiss = useCallback(() => {
    if (success) onSuccess()
    onClose()
  }, [success, onSuccess, onClose])

  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: handleDismiss })

  const formattedDate = parsedDate.toLocaleDateString("uk-UA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div
      className="book-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss()
      }}
    >
      <div
        className="book-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-modal-title"
      >
        {success ? (
          <>
            <div className="book-modal__header">
              <h2 className="book-modal__title" id="reschedule-modal-title">
                {bookStrings.reschedule.updatedTitle}
              </h2>
              <button className="book-modal__close" onClick={handleDismiss} type="button">
                &times;
              </button>
            </div>
            <div className="book-modal__body">
              <div className="book-modal__success-icon">&#10003;</div>
              <p className="book-modal__success-text">
                {bookStrings.reschedule.updatedText(tableNumber)}
              </p>
            </div>
            <div className="book-modal__actions">
              <button
                className="book-modal__btn book-modal__btn--confirm"
                onClick={handleDismiss}
                type="button"
              >
                {bookStrings.modal.actions.ok}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="book-modal__header">
              <h2 className="book-modal__title" id="reschedule-modal-title">
                {bookStrings.reschedule.title(tableNumber)}
              </h2>
              <button className="book-modal__close" onClick={onClose} type="button">
                &times;
              </button>
            </div>

            <div className="book-modal__body">
              <section className="book-modal__section">
                <h3 className="book-modal__section-title">
                  {bookStrings.reschedule.sections.date}
                </h3>
                <p className="book-modal__empty">{formattedDate}</p>
              </section>

              <section className="book-modal__section">
                <h3 className="book-modal__section-title">
                  {bookStrings.reschedule.sections.time}
                </h3>
                {prolongOnly || endTimeOnly ? (
                  <p className="book-modal__empty">
                    {bookStrings.reschedule.startingFrom(currentStartTime)}
                  </p>
                ) : slotsLoading ? (
                  <p className="book-modal__empty">{bookStrings.modal.slots.loading}</p>
                ) : !dayConfig ? (
                  <p className="book-modal__empty">{bookStrings.modal.slots.closed}</p>
                ) : timeSlots.length === 0 ? (
                  <p className="book-modal__empty">{bookStrings.modal.slots.none}</p>
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
                <h3 className="book-modal__section-title">
                  {bookStrings.reschedule.sections.duration}
                </h3>
                <div className="book-modal__duration-input">
                  <input
                    type="number"
                    className="book-modal__duration-field"
                    min={MIN_DURATION}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(Math.max(MIN_DURATION, Number(e.target.value)))
                    }
                  />
                  {durationError && <p className="book-modal__hint">{durationError}</p>}
                </div>
              </section>

              <section className="book-modal__section">
                <h3 className="book-modal__section-title">
                  {bookStrings.reschedule.sections.guests}
                </h3>
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
                  <h3 className="book-modal__section-title">
                    {bookStrings.reschedule.sections.summary}
                  </h3>
                  <div className="book-modal__summary">
                    <div className="book-modal__summary-row">
                      <span>{bookStrings.modal.summary.table}</span>
                      <span>#{tableNumber}</span>
                    </div>
                    <div className="book-modal__summary-row">
                      <span>{bookStrings.modal.summary.date}</span>
                      <span>{formattedDate}</span>
                    </div>
                    <div className="book-modal__summary-row">
                      <span>{bookStrings.modal.summary.time}</span>
                      <span>
                        {selectedTime} &ndash; {endAt}
                      </span>
                    </div>
                    <div className="book-modal__summary-row">
                      <span>{bookStrings.modal.summary.duration}</span>
                      <span>
                        {durationMinutes} {bookStrings.modal.durationUnit}
                      </span>
                    </div>
                    <div className="book-modal__summary-row">
                      <span>{bookStrings.modal.summary.guests}</span>
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
                {bookStrings.reschedule.actions.cancel}
              </button>
              <button
                className="book-modal__btn book-modal__btn--confirm"
                onClick={handleSave}
                disabled={!selectedTime || submitting || !!durationError}
                type="button"
              >
                {submitting
                  ? bookStrings.reschedule.actions.saving
                  : bookStrings.reschedule.actions.save}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
