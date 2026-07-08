import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import type { Table } from "@/types/api/types.gen"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import type { WorkingHoursDay, ReservationWithTable } from "./api"
import { createReservation, fetchAvailableSlots, fetchRestaurantSettings } from "./api"
import { SlotsSkeleton } from "./BookingSkeleton"
import { DurationInput } from "./DurationInput"
import { GuestStepper } from "./GuestStepper"
import { useDateWindow } from "./hooks/useDateWindow"
import { downloadReservationIcs } from "./ics"
import { SlotSummary } from "./SlotSummary"
import { bookStrings } from "./strings"
import { TimeSlotGrid } from "./TimeSlotGrid"
import {
  DAY_NAMES,
  DEFAULT_DURATION,
  DEFAULT_GUESTS,
  generateTimeSlots,
  getDurationError,
  localDateKey,
  maxDurationBeforeClose,
  MIN_DURATION,
  minutesToTime,
  slotDateKey,
  timeToMinutes,
  zonedWallTimeToUtcIso,
} from "./utils"
import "./BookModal.css"

// Confetti burst colors for the booking-confirmed screen.
const CONFETTI_COLORS = ["#f5a623", "#4caf50", "#2196f3", "#e91e63", "#9c27b0", "#ff5722"]

interface BookModalProps {
  // Only the identity + size is needed, so both a full Table (customer flow) and a
  // FloorTable (waiter view) can be passed.
  table: Pick<Table, "public_id" | "public_number" | "capacity">
  workingHours: Record<string, WorkingHoursDay> | null
  timeZone?: string | null
  onClose: () => void
  onSuccess: (data?: ReservationWithTable) => void
  // Prefill from the floor-plan slot picker so the guest lands on the slot they
  // already chose instead of starting over.
  initialDate?: Date
  initialTime?: string | null
  initialGuests?: number
  // Staff booking on behalf of a guest (waiter view): shows a guest-name field and
  // fetches working hours from the restaurant when the caller passes none.
  restaurantId?: string | null
  showNameField?: boolean
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
  restaurantId,
  showNameField,
}: BookModalProps) {
  // Keyed to the venue's calendar day (not the guest's device clock), so
  // "today" matches the working day the backend checks.
  const { today, dates } = useDateWindow(timeZone ?? null)

  const [selectedDate, setSelectedDate] = useState(() => {
    if (!initialDate) return today
    const d = new Date(initialDate)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedTime, setSelectedTime] = useState<string | null>(initialTime ?? null)
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION)
  // Clamped to the table in BOTH branches — the default too, or opening a
  // capacity-1 table starts at 2 guests and 400s until the stepper is touched.
  const [guestCount, setGuestCount] = useState(() =>
    Math.max(1, Math.min(initialGuests ?? DEFAULT_GUESTS, table.capacity)),
  )
  const [notes, setNotes] = useState("")
  const [guestName, setGuestName] = useState("")
  // Holds the created reservation so we can hand it back to the caller (waiter
  // view) when the confirmation is dismissed.
  const reservationRef = useRef<ReservationWithTable | null>(null)
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

  // The waiter view opens the modal without working hours; fetch them from the
  // restaurant so the time grid still knows open/close.
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

  // Guards the slot fetch from setting state after the modal closes/unmounts.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadSlots = useCallback(() => {
    return fetchAvailableSlots(table.public_id)
      .then((data) => {
        if (mountedRef.current) setAvailableSlots(data)
      })
      .catch(() => {
        // null = "unknown", not "no slots anywhere": a {} sentinel here made the
        // date gating gray out every day, locking the guest out of navigation.
        // With null the days stay clickable and times fall back to
        // generateTimeSlots; the backend re-checks the slot on create anyway.
        if (mountedRef.current) setAvailableSlots(null)
      })
      .finally(() => {
        if (mountedRef.current) setSlotsLoading(false)
      })
  }, [table.public_id])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const dayName = DAY_NAMES[selectedDate.getDay()]
  const dayConfig = effectiveWorkingHours?.[dayName]

  const dateKey = localDateKey(selectedDate)

  // Cap the booking length to the time left before close, so a late slot (e.g.
  // 20:30 with a 22:00 close) is bookable for the 90 min that remain instead of
  // forcing the guest to shrink the default 2h by hand. The desired duration is
  // kept and re-applied automatically when an earlier slot leaves room again.
  const maxDuration = useMemo(
    () => maxDurationBeforeClose(selectedTime, dayConfig),
    [selectedTime, dayConfig],
  )

  // Two values on purpose: `durationMinutes` is the guest's *desired* length
  // (state, persists across slot changes); `effectiveDuration` is what's actually
  // shown in the input, validated and booked — the desired value capped to what
  // fits before close. Read/use `effectiveDuration` everywhere (input, summary,
  // endAt, confirm); only the duration <input> onChange writes `durationMinutes`.
  const effectiveDuration = Number.isFinite(maxDuration)
    ? Math.min(durationMinutes, maxDuration)
    : durationMinutes

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
    return generateTimeSlots(selectedDate, dayConfig, timeZone)
  }, [realSlots, selectedDate, dayConfig, timeZone])

  const endAt = useMemo(() => {
    if (!selectedTime || !effectiveDuration) return ""
    return minutesToTime(timeToMinutes(selectedTime) + effectiveDuration)
  }, [selectedTime, effectiveDuration])

  const durationError = useMemo(() => {
    if (!selectedTime || !effectiveDuration) return null
    const startMins = timeToMinutes(selectedTime)
    const endMins = startMins + effectiveDuration
    return getDurationError(startMins, endMins, dayConfig, availableSlots?.[dateKey] ?? null)
  }, [selectedTime, effectiveDuration, dayConfig, availableSlots, dateKey])

  const handleConfirm = useCallback(async () => {
    if (!selectedTime) return
    setError(null)
    setSubmitting(true)

    try {
      // A slot after midnight on an overnight day belongs to the next calendar
      // day (the backend keys it under the opening day), so resolve its real date.
      const dateKey = slotDateKey(selectedDate, selectedTime, dayConfig)
      // Interpret the picked slot as the restaurant's wall-clock time, not the
      // browser's — otherwise a guest in another timezone books the wrong instant.
      const startISO = timeZone
        ? zonedWallTimeToUtcIso(dateKey, selectedTime, timeZone)
        : new Date(`${dateKey}T${selectedTime}:00`).toISOString()
      const endISO = new Date(
        new Date(startISO).getTime() + effectiveDuration * 60000,
      ).toISOString()

      // The backend is the single source of truth: it re-checks the slot inside
      // the create transaction and returns a clear 409 if the table was taken.
      const body: Parameters<typeof createReservation>[0] = {
        table: table.public_id,
        guest_count: guestCount,
        start_at: startISO,
        end_at: endISO,
        notes: notes || undefined,
      }
      if (showNameField && guestName) {
        body.guest_name = guestName
      }
      reservationRef.current = await createReservation(body)

      setSuccess({
        tableNumber: table.public_number,
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
    dayConfig,
    effectiveDuration,
    endAt,
    guestCount,
    notes,
    guestName,
    showNameField,
    timeZone,
    loadSlots,
    table.public_id,
    table.public_number,
  ])

  // After a successful booking, dismissing must also notify the parent so it can
  // refresh. Backdrop click and Escape share this.
  const handleDismiss = useCallback(() => {
    if (success) onSuccess(reservationRef.current ?? undefined)
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
            <div className="book-confetti" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <span
                  key={i}
                  className="book-confetti__piece"
                  style={
                    {
                      left: `${8 + (i * 84) / 17}%`,
                      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                      "--cx": `${((i % 5) - 2) * 26}px`,
                      "--cr": `${(i % 2 ? 1 : -1) * (200 + i * 15)}deg`,
                      animationDelay: `${(i % 6) * 45}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
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
                {bookStrings.modal.title(table.public_number)}
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
                {slotsLoading || fallbackHoursLoading ? (
                  <SlotsSkeleton />
                ) : !dayConfig && !realSlots ? (
                  // No day config to fall back to a client-generated grid, but
                  // when real slots already came back from the server, trust
                  // that over declaring the day closed.
                  <p className="book-modal__empty">{bookStrings.modal.slots.closed}</p>
                ) : timeSlots.length === 0 ? (
                  <p className="book-modal__empty">{bookStrings.modal.slots.none}</p>
                ) : (
                  <TimeSlotGrid
                    slots={timeSlots}
                    selectedTime={selectedTime}
                    onSelect={setSelectedTime}
                  />
                )}
              </section>

              <section className="book-modal__section">
                <h3 className="book-modal__section-title">{bookStrings.modal.sections.duration}</h3>
                <DurationInput
                  value={effectiveDuration}
                  min={MIN_DURATION}
                  max={maxDuration}
                  onChange={setDurationMinutes}
                  error={durationError}
                />
              </section>

              <section className="book-modal__section">
                <h3 className="book-modal__section-title">{bookStrings.modal.sections.guests}</h3>
                <GuestStepper value={guestCount} max={table.capacity} onChange={setGuestCount} />
              </section>

              {showNameField && (
                <section className="book-modal__section">
                  <h3 className="book-modal__section-title">
                    {bookStrings.modal.sections.guestName}
                  </h3>
                  <input
                    type="text"
                    className="book-modal__notes"
                    placeholder={bookStrings.modal.guestNamePlaceholder}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </section>
              )}

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
                <SlotSummary
                  title={bookStrings.modal.sections.confirmation}
                  tableNumber={table.public_number}
                  date={selectedDate.toLocaleDateString("uk-UA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  time={selectedTime}
                  endTime={endAt}
                  duration={effectiveDuration}
                  guests={guestCount}
                />
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
