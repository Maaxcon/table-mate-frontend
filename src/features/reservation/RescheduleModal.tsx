import { useCallback, useEffect, useMemo, useState } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { WorkingHoursDay } from "./api"
import { fetchAvailableSlots, fetchRestaurantSettings, modifyReservation } from "./api"
import { bookStrings } from "./strings"
import {
  DAY_NAMES,
  formatTimeInTz,
  generateTimeSlots,
  localDateKey,
  MIN_DURATION,
  minutesToTime,
  slotDateKey,
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

// Loads restaurant settings when the caller doesn't supply them (e.g. the
// cabinet passes workingHours=null), then renders the form only once the
// timezone is known — so the form's tz-derived initial state isn't first
// computed in the browser's zone and then stuck.
export function RescheduleModal(props: RescheduleModalProps) {
  const { workingHours, timeZone, restaurantId, onClose } = props
  const [fetched, setFetched] = useState<{
    workingHours: Record<string, WorkingHoursDay> | null
    timeZone: string | null
  } | null>(null)

  const needsSettings = !workingHours && !!restaurantId

  useEffect(() => {
    if (!needsSettings || !restaurantId) return
    let cancelled = false
    fetchRestaurantSettings(restaurantId)
      .then((s) => {
        if (!cancelled) setFetched({ workingHours: s.working_hours, timeZone: s.timezone })
      })
      .catch(() => {
        if (!cancelled) setFetched({ workingHours: null, timeZone: null })
      })
    return () => {
      cancelled = true
    }
  }, [needsSettings, restaurantId])

  if (needsSettings && !fetched) {
    return (
      <div
        className="book-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="book-modal" role="dialog" aria-modal="true" aria-busy="true">
          <p className="book-modal__empty">{bookStrings.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <RescheduleForm
      {...props}
      workingHours={workingHours ?? fetched?.workingHours ?? null}
      timeZone={timeZone ?? fetched?.timeZone ?? null}
    />
  )
}

// Inner form. By the time it mounts, workingHours/timeZone are resolved (from
// props or the wrapper's fetch), so its tz-derived initial state — snapped start
// time and duration — is computed in the correct zone.
function RescheduleForm({
  publicId,
  tableNumber,
  tablePublicId,
  currentDate,
  currentStart,
  currentEnd,
  currentGuests,
  tableCapacity,
  workingHours,
  timeZone,
  excludeReservationIds,
  prolongOnly = false,
  endTimeOnly = false,
  onClose,
  onSuccess,
}: RescheduleModalProps) {
  const effectiveTimeZone = timeZone ?? null

  const currentStartTime = formatTimeInTz(currentStart, effectiveTimeZone)
  const currentEndTime = formatTimeInTz(currentEnd, effectiveTimeZone)
  // Derive duration from the actual instants, not the wall-clock HH:MM strings,
  // so a booking that crosses midnight (e.g. 23:00–01:00) isn't computed as a
  // negative span and clamped to the minimum.
  const currentDurationMinutes = Math.round(
    (new Date(currentEnd).getTime() - new Date(currentStart).getTime()) / 60000,
  )

  const parsedDate = useMemo(() => new Date(currentDate), [currentDate])

  const initialSnappedTime = useMemo(() => {
    const mins = timeToMinutes(currentStartTime)
    const snapped = Math.round(mins / 30) * 30
    return minutesToTime(snapped)
  }, [currentStartTime])

  const [selectedTime, setSelectedTime] = useState<string | null>(
    prolongOnly || endTimeOnly ? currentStartTime : initialSnappedTime,
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
  const dayConfig = workingHours?.[dayName]

  const timeSlots = useMemo(() => {
    if (availableSlots) return availableSlots
    return generateTimeSlots(parsedDate, dayConfig, effectiveTimeZone)
  }, [availableSlots, parsedDate, dayConfig, effectiveTimeZone])

  const endAt = useMemo(() => {
    if (!selectedTime) return ""
    // When only the end moves (active booking), the start stays at its real,
    // unsnapped value — anchor the end there, not on the snapped selectedTime.
    const baseMins = endTimeOnly ? timeToMinutes(currentStartTime) : timeToMinutes(selectedTime)
    return minutesToTime(baseMins + durationMinutes)
  }, [selectedTime, durationMinutes, endTimeOnly, currentStartTime])

  const durationError = useMemo(() => {
    if (!selectedTime || !durationMinutes) return null

    const baseMins = endTimeOnly ? timeToMinutes(currentStartTime) : timeToMinutes(selectedTime)
    const endMins = baseMins + durationMinutes

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
    currentStartTime,
    endTimeOnly,
  ])

  const handleSave = useCallback(async () => {
    if (!selectedTime) return
    setError(null)
    setSubmitting(true)

    try {
      // A slot after midnight on an overnight day belongs to the next calendar
      // day (the backend keys it under the opening day), so resolve its real date.
      const slotKey = slotDateKey(parsedDate, selectedTime, dayConfig)
      // Interpret the picked slot in the restaurant timezone, not the browser's.
      const startISO = effectiveTimeZone
        ? zonedWallTimeToUtcIso(slotKey, selectedTime, effectiveTimeZone)
        : new Date(`${slotKey}T${selectedTime}:00`).toISOString()
      // Extending an active booking only moves the end: anchor it to the real,
      // unsnapped start so the stored duration is exactly what the guest picked
      // (selectedTime is the start snapped to 30 min and would skew it by ±15m).
      const endBaseMs = endTimeOnly
        ? new Date(currentStart).getTime()
        : new Date(startISO).getTime()
      const endISO = new Date(endBaseMs + durationMinutes * 60000).toISOString()

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
  }, [
    selectedTime,
    parsedDate,
    dayConfig,
    durationMinutes,
    guestCount,
    publicId,
    endTimeOnly,
    currentStart,
    effectiveTimeZone,
  ])

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
