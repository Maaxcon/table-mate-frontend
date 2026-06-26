import { useCallback, useEffect, useMemo, useState } from "react"
import type { Table } from "@/types/api/types.gen"
import type { WorkingHoursDay } from "./api"
import { createReservation, fetchAvailableSlots } from "./api"
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
}

export function BookModal({ table, workingHours, timeZone, onClose, onSuccess }: BookModalProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(120)
  const [guestCount, setGuestCount] = useState(2)
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
            <h2 className="book-modal__title">{bookStrings.modal.confirmedTitle}</h2>
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
              {bookStrings.modal.success(success.tableNumber)}
            </p>
            <div className="book-modal__summary">
              <div className="book-modal__summary-row">
                <span>{bookStrings.modal.summary.date}</span>
                <span>{success.date}</span>
              </div>
              <div className="book-modal__summary-row">
                <span>{bookStrings.modal.summary.time}</span>
                <span>
                  {success.time} &ndash; {success.endTime}
                </span>
              </div>
              <div className="book-modal__summary-row">
                <span>{bookStrings.modal.summary.guests}</span>
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
              {bookStrings.modal.actions.ok}
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
          <h2 className="book-modal__title">{bookStrings.modal.title(table.table_number)}</h2>
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
            <h3 className="book-modal__section-title">{bookStrings.modal.sections.duration}</h3>
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
            {submitting ? bookStrings.modal.actions.submitting : bookStrings.modal.actions.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
