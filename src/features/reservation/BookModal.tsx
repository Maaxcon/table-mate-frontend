import { useCallback, useEffect, useMemo, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { WorkingHoursDay } from "./api"
import { createReservation, fetchAvailableSlots } from "./api"
import { SlotsSkeleton } from "./BookingSkeleton"
import { downloadReservationIcs } from "./ics"
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

interface BookModalProps {
  table: Table
  workingHours: Record<string, WorkingHoursDay> | null
  timeZone: string | null
  onClose: () => void
  onSuccess: () => void
  // Prefill from the floor-plan slot picker so the guest lands on the slot they
  // already chose instead of starting over.
  initialDate?: Date
  initialTime?: string | null
  initialGuests?: number
}

export function BookModal({
  table,
  workingHours,
  timeZone,
  onClose,
  onSuccess,
  initialDate,
  initialTime,
  initialGuests,
}: BookModalProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [selectedDate, setSelectedDate] = useState(() => {
    if (!initialDate) return today
    const d = new Date(initialDate)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedTime, setSelectedTime] = useState<string | null>(initialTime ?? null)
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [guestCount, setGuestCount] = useState(() =>
    initialGuests ? Math.min(initialGuests, table.capacity) : 2,
  )
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    tableNumber: string
    date: string
    time: string
    endTime: string
    guests: number
    startISO: string
    endISO: string
  } | null>(null)

  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]> | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(true)

  const loadSlots = useCallback(() => {
    return fetchAvailableSlots(table.public_id)
      .then((data) => setAvailableSlots(data))
      .catch(() => setAvailableSlots({}))
      .finally(() => setSlotsLoading(false))
  }, [table.public_id])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

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

  // Only worth flagging when the guest's device clock is in a different zone.
  const foreignTzNote = useMemo(() => {
    if (!timeZone) return null
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return browserTz === timeZone ? null : timeZone
  }, [timeZone])

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
        return bookStrings.modal.validation.closingExceeded(dayConfig.close)
      }
    }

    if (availableSlots) {
      const slots = availableSlots[dateKey]
      if (slots) {
        const startMins = timeToMinutes(selectedTime)
        for (let m = startMins; m < endMins; m += 30) {
          const slotTime = minutesToTime(m)
          if (!slots.includes(slotTime)) {
            return bookStrings.modal.validation.durationUnavailable
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
      const dateKey = localDateKey(selectedDate)
      // Interpret the picked slot as the restaurant's wall-clock time, not the
      // browser's — otherwise a guest in another timezone books the wrong instant.
      const startISO = timeZone
        ? zonedWallTimeToUtcIso(dateKey, selectedTime, timeZone)
        : new Date(`${dateKey}T${selectedTime}:00`).toISOString()
      const endISO = new Date(new Date(startISO).getTime() + durationMinutes * 60000).toISOString()

      // The backend is the single source of truth: it re-checks the slot inside
      // the create transaction and returns a clear 409 if the table was taken.
      await createReservation({
        table: table.public_id,
        guest_count: guestCount,
        start_at: startISO,
        end_at: endISO,
        notes: notes || undefined,
      })

      setSuccess({
        tableNumber: table.table_number,
        date: localDateKey(selectedDate),
        time: selectedTime,
        endTime: endAt,
        guests: guestCount,
        startISO,
        endISO,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : bookStrings.modal.createFailed)
      // Someone may have just taken this slot; refresh so the grid reflects it.
      setSelectedTime(null)
      setSlotsLoading(true)
      loadSlots()
    } finally {
      setSubmitting(false)
    }
  }, [
    selectedTime,
    selectedDate,
    durationMinutes,
    endAt,
    guestCount,
    notes,
    timeZone,
    loadSlots,
    table.public_id,
    table.table_number,
  ])

  // After a successful booking, dismissing must also notify the parent so it can
  // refresh. Backdrop click and Escape share this.
  const handleDismiss = useCallback(() => {
    if (success) onSuccess()
    onClose()
  }, [success, onSuccess, onClose])

  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: handleDismiss })

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
        aria-labelledby="book-modal-title"
      >
        {success ? (
          <>
            <div className="book-modal__header">
              <h2 className="book-modal__title" id="book-modal-title">
                {bookStrings.modal.confirmedTitle}
              </h2>
              <button className="book-modal__close" onClick={handleDismiss} type="button">
                &times;
              </button>
            </div>
            <div className="book-modal__body">
              <div className="book-ticket">
                <div className="book-ticket__top">
                  <span className="book-ticket__label">{bookStrings.modal.ticket.label}</span>
                  <span className="book-ticket__success" aria-hidden="true">
                    &#10003;
                  </span>
                  <span className="book-ticket__table-label">
                    {bookStrings.modal.ticket.tableLabel}
                  </span>
                  <span className="book-ticket__table-num">{success.tableNumber}</span>
                </div>
                <div className="book-ticket__perf" aria-hidden="true" />
                <div className="book-ticket__stub">
                  <div className="book-ticket__cells">
                    <div className="book-ticket__cell">
                      <span>{bookStrings.modal.summary.date}</span>
                      <strong>{success.date}</strong>
                    </div>
                    <div className="book-ticket__cell">
                      <span>{bookStrings.modal.summary.time}</span>
                      <strong>
                        {success.time}&ndash;{success.endTime}
                      </strong>
                    </div>
                    <div className="book-ticket__cell">
                      <span>{bookStrings.modal.summary.guests}</span>
                      <strong>{success.guests}</strong>
                    </div>
                  </div>
                  <div className="book-ticket__qr" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
            <div className="book-modal__actions">
              <button
                className="book-modal__btn book-modal__btn--cancel"
                onClick={() =>
                  downloadReservationIcs({
                    tableNumber: success.tableNumber,
                    startISO: success.startISO,
                    endISO: success.endISO,
                    guests: success.guests,
                    summary: bookStrings.modal.title(success.tableNumber),
                    guestsLabel: bookStrings.modal.summary.guests,
                  })
                }
                type="button"
              >
                {bookStrings.modal.ticket.addToCalendar}
              </button>
              <button
                className="book-modal__btn book-modal__btn--confirm"
                onClick={handleDismiss}
                type="button"
              >
                {bookStrings.modal.ticket.done}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="book-modal__header">
              <h2 className="book-modal__title" id="book-modal-title">
                {bookStrings.modal.title(table.table_number)}
              </h2>
              <button className="book-modal__close" onClick={onClose} type="button">
                &times;
              </button>
            </div>

            <div className="book-modal__body">
              <section className="book-modal__section">
                <h3 className="book-modal__section-title">{bookStrings.modal.sections.date}</h3>
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
                          {d.toLocaleDateString("uk-UA", { weekday: "short" })}
                        </span>
                        <span className="book-modal__date-num">{d.getDate()}</span>
                        {isToday && (
                          <span className="book-modal__date-today">{bookStrings.modal.today}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="book-modal__section">
                <h3 className="book-modal__section-title">{bookStrings.modal.sections.time}</h3>
                {foreignTzNote && (
                  <p className="book-modal__tz-note">{bookStrings.modal.tzNote(foreignTzNote)}</p>
                )}
                {slotsLoading ? (
                  <SlotsSkeleton />
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
                <h3 className="book-modal__section-title">{bookStrings.modal.sections.duration}</h3>
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
                <h3 className="book-modal__section-title">{bookStrings.modal.sections.guests}</h3>
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

              <section className="book-modal__section">
                <h3 className="book-modal__section-title">{bookStrings.modal.sections.notes}</h3>
                <textarea
                  className="book-modal__notes"
                  placeholder={bookStrings.modal.notesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </section>

              {selectedTime && (
                <section className="book-modal__section book-modal__section--summary">
                  <h3 className="book-modal__section-title">
                    {bookStrings.modal.sections.confirmation}
                  </h3>
                  <div className="book-modal__summary">
                    <div className="book-modal__summary-row">
                      <span>{bookStrings.modal.summary.table}</span>
                      <span>#{table.table_number}</span>
                    </div>
                    <div className="book-modal__summary-row">
                      <span>{bookStrings.modal.summary.date}</span>
                      <span>
                        {selectedDate.toLocaleDateString("uk-UA", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
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
                {bookStrings.modal.actions.cancel}
              </button>
              <button
                className="book-modal__btn book-modal__btn--confirm"
                onClick={handleConfirm}
                disabled={!selectedTime || submitting || !!durationError}
                type="button"
              >
                {submitting
                  ? bookStrings.modal.actions.submitting
                  : bookStrings.modal.actions.confirm}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
