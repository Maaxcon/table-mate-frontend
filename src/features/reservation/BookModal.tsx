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
  normalizeSlots,
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
  // Optional nearby tables for the "mini floor" preview in step 2.
  tablePreviewItems?: Array<Pick<Table, "public_id" | "public_number" | "capacity">>
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
  tablePreviewItems,
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
  const [currentStep, setCurrentStep] = useState(0)
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

  // Only worth flagging when the guest's device clock is in a different zone.
  const foreignTzNote = useMemo(() => {
    if (!timeZone) return null
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return browserTz === timeZone ? null : timeZone
  }, [timeZone])

  const realSlots = useMemo(() => {
    if (!availableSlots) return null
    const raw = availableSlots[dateKey]
    if (!raw) return null
    return normalizeSlots(raw)
  }, [availableSlots, dateKey])

  const generatedTimeSlots = useMemo(
    () => generateTimeSlots(selectedDate, dayConfig, timeZone),
    [selectedDate, dayConfig, timeZone],
  )

  const timeSlots = useMemo(() => {
    if (realSlots && generatedTimeSlots.length > 0) return generatedTimeSlots
    if (realSlots) return realSlots
    return generatedTimeSlots
  }, [realSlots, generatedTimeSlots])

  const disabledTimeSlots = useMemo(() => {
    if (!realSlots) return []
    const available = new Set(realSlots)
    return timeSlots.filter((slot) => !available.has(slot))
  }, [realSlots, timeSlots])

  const disabledTimeSlotSet = useMemo(() => new Set(disabledTimeSlots), [disabledTimeSlots])
  const selectedTimeValue = useMemo(() => {
    if (!selectedTime) return null
    return disabledTimeSlotSet.has(selectedTime) ? null : selectedTime
  }, [selectedTime, disabledTimeSlotSet])

  // Cap the booking length to the time left before close, so a late slot (e.g.
  // 20:30 with a 22:00 close) is bookable for the 90 min that remain instead of
  // forcing the guest to shrink the default 2h by hand. The desired duration is
  // kept and re-applied automatically when an earlier slot leaves room again.
  const maxDuration = useMemo(
    () => maxDurationBeforeClose(selectedTimeValue, dayConfig),
    [selectedTimeValue, dayConfig],
  )

  // Two values on purpose: `durationMinutes` is the guest's *desired* length
  // (state, persists across slot changes); `effectiveDuration` is what's actually
  // shown in the input, validated and booked — the desired value capped to what
  // fits before close. Read/use `effectiveDuration` everywhere (input, summary,
  // endAt, confirm); only the duration <input> onChange writes `durationMinutes`.
  const effectiveDuration = Number.isFinite(maxDuration)
    ? Math.min(durationMinutes, maxDuration)
    : durationMinutes

  const endAt = useMemo(() => {
    if (!selectedTimeValue || !effectiveDuration) return ""
    return minutesToTime(timeToMinutes(selectedTimeValue) + effectiveDuration)
  }, [selectedTimeValue, effectiveDuration])

  const durationError = useMemo(() => {
    if (!selectedTimeValue || !effectiveDuration) return null
    const startMins = timeToMinutes(selectedTimeValue)
    const endMins = startMins + effectiveDuration
    return getDurationError(startMins, endMins, dayConfig, availableSlots?.[dateKey] ?? null)
  }, [selectedTimeValue, effectiveDuration, dayConfig, availableSlots, dateKey])

  // Staff mode only (showNameField). The backend only routes to
  // create_staff_reservation when guest_name is truthy — a blank name
  // silently falls through to the customer path and books the reservation
  // under the WAITER's own account instead of the walk-in guest's. Blocking
  // submit here is the only guard: the backend has no way to tell "staff
  // forgot the name" apart from "this is actually a self-service booking".
  const nameError =
    showNameField && !guestName.trim() ? bookStrings.modal.validation.guestNameRequired : null
  const floorPreviewTables = useMemo(() => {
    const source = tablePreviewItems && tablePreviewItems.length > 0 ? tablePreviewItems : [table]
    const selectedPresent = source.some((t) => t.public_id === table.public_id)
    const withSelected = selectedPresent
      ? source
      : [
          ...source,
          {
            public_id: table.public_id,
            public_number: table.public_number,
            capacity: table.capacity,
          },
        ]
    return [...withSelected]
      .sort((a, b) =>
        String(a.public_number).localeCompare(String(b.public_number), undefined, {
          numeric: true,
        }),
      )
      .slice(0, 12)
  }, [tablePreviewItems, table.public_id, table.public_number, table.capacity])
  const flowSteps = bookStrings.modal.flow.steps
  const totalSteps = flowSteps.length
  const isLastStep = currentStep === totalSteps - 1
  const progress = ((currentStep + 1) / totalSteps) * 100

  const canGoNext = useMemo(() => {
    if (currentStep === 0) {
      return Boolean(selectedTimeValue) && !durationError
    }
    if (currentStep === 1) {
      return guestCount >= 1 && guestCount <= table.capacity
    }
    if (currentStep === 2) {
      return !nameError
    }
    return false
  }, [currentStep, selectedTimeValue, durationError, guestCount, table.capacity, nameError])

  const canConfirm = Boolean(selectedTimeValue) && !durationError && !nameError && !submitting

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    if (!canGoNext) return
    setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))
  }, [canGoNext, totalSteps])

  const handleConfirm = useCallback(async () => {
    if (!selectedTimeValue || nameError) return
    setError(null)
    setSubmitting(true)

    try {
      // A slot after midnight on an overnight day belongs to the next calendar
      // day (the backend keys it under the opening day), so resolve its real date.
      const dateKey = slotDateKey(selectedDate, selectedTimeValue, dayConfig)
      // Interpret the picked slot as the restaurant's wall-clock time, not the
      // browser's — otherwise a guest in another timezone books the wrong instant.
      const startISO = timeZone
        ? zonedWallTimeToUtcIso(dateKey, selectedTimeValue, timeZone)
        : new Date(`${dateKey}T${selectedTimeValue}:00`).toISOString()
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
        time: selectedTimeValue,
        endTime: endAt,
        guests: guestCount,
        startISO,
        endISO,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : bookStrings.modal.createFailed)
      // Someone may have just taken this slot; refresh so the grid reflects it.
      setSelectedTime(null)
      setCurrentStep(0)
      setSlotsLoading(true)
      loadSlots()
    } finally {
      setSubmitting(false)
    }
  }, [
    selectedTimeValue,
    selectedDate,
    dayConfig,
    effectiveDuration,
    endAt,
    guestCount,
    notes,
    guestName,
    showNameField,
    nameError,
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
            <div className="book-modal__header book-modal__header--flow">
              <div className="book-modal__header-row">
                <h2 className="book-modal__title" id="book-modal-title">
                  {bookStrings.modal.title(table.public_number)}
                </h2>
                <button className="book-modal__close" onClick={onClose} type="button">
                  &times;
                </button>
              </div>
              <div className="book-modal__flow">
                <p className="book-modal__flow-meta">
                  {bookStrings.modal.flow.stepLabel(currentStep + 1, totalSteps)}
                </p>
                <div
                  className="book-modal__flow-track"
                  role="progressbar"
                  aria-valuemin={1}
                  aria-valuemax={totalSteps}
                  aria-valuenow={currentStep + 1}
                  aria-valuetext={bookStrings.modal.flow.stepLabel(currentStep + 1, totalSteps)}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
                <ol className="book-modal__flow-steps" aria-label="Кроки бронювання">
                  {flowSteps.map((step, index) => {
                    const state =
                      index < currentStep
                        ? "book-modal__flow-step--done"
                        : index === currentStep
                          ? "book-modal__flow-step--active"
                          : ""
                    return (
                      <li
                        key={step}
                        className={["book-modal__flow-step", state].filter(Boolean).join(" ")}
                      >
                        <span className="book-modal__flow-dot">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>

            <div className="book-modal__body">
              <div key={`step-${currentStep}`} className="book-modal__step-panel">
                {currentStep === 0 && (
                  <>
                    <section className="book-modal__section">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.date}
                      </h3>
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
                          const hasSlots = availableSlots
                            ? (availableSlots[dKey]?.length ?? 0) > 0
                            : true
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
                                <span className="book-modal__date-today">
                                  {bookStrings.modal.today}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </section>

                    <section className="book-modal__section">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.time}
                      </h3>
                      {foreignTzNote && (
                        <p className="book-modal__tz-note">
                          {bookStrings.modal.tzNote(foreignTzNote)}
                        </p>
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
                          selectedTime={selectedTimeValue}
                          onSelect={setSelectedTime}
                          disabledSlots={disabledTimeSlots}
                        />
                      )}
                    </section>

                    <section className="book-modal__section">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.duration}
                      </h3>
                      <DurationInput
                        value={effectiveDuration}
                        min={MIN_DURATION}
                        max={maxDuration}
                        onChange={setDurationMinutes}
                        error={durationError}
                      />
                    </section>
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <section className="book-modal__section">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.table}
                      </h3>
                      <div className="book-modal__table-card">
                        <div>
                          <p className="book-modal__table-name">
                            {bookStrings.modal.summary.table} {table.public_number}
                          </p>
                          <p className="book-modal__table-meta">
                            {bookStrings.floorPlan.seats(table.capacity)}
                          </p>
                        </div>
                        {selectedTimeValue && (
                          <p className="book-modal__table-slot">
                            {selectedDate.toLocaleDateString("uk-UA", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {selectedTimeValue}&ndash;{endAt}
                          </p>
                        )}
                      </div>
                      <div className="book-modal__mini-floor-wrap">
                        <p className="book-modal__section-title">
                          {bookStrings.modal.flow.miniFloorTitle}
                        </p>
                        <p className="book-modal__tz-note">
                          {bookStrings.modal.flow.miniFloorHint}
                        </p>
                        <div
                          className="book-modal__mini-floor"
                          role="list"
                          aria-label={bookStrings.modal.flow.miniFloorTitle}
                        >
                          {floorPreviewTables.map((previewTable) => {
                            const isSelected = previewTable.public_id === table.public_id
                            const seats = Math.min(previewTable.capacity, 6)
                            return (
                              <div
                                key={previewTable.public_id}
                                role="listitem"
                                className={[
                                  "book-modal__mini-table",
                                  isSelected ? "book-modal__mini-table--selected" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <span className="book-modal__mini-table-num">
                                  {previewTable.public_number}
                                </span>
                                <div className="book-modal__mini-table-seats" aria-hidden="true">
                                  {Array.from({ length: seats }, (_, index) => (
                                    <span key={`${previewTable.public_id}-seat-${index}`} />
                                  ))}
                                </div>
                                <span className="book-modal__mini-table-cap">
                                  {bookStrings.floorPlan.seats(previewTable.capacity)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </section>

                    <section className="book-modal__section">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.guests}
                      </h3>
                      <GuestStepper
                        value={guestCount}
                        max={table.capacity}
                        onChange={setGuestCount}
                      />
                    </section>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <section className="book-modal__section">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.contacts}
                      </h3>
                      {showNameField ? (
                        <>
                          <input
                            type="text"
                            className="book-modal__notes"
                            placeholder={bookStrings.modal.guestNamePlaceholder}
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                          />
                          {nameError && <p className="book-modal__hint">{nameError}</p>}
                        </>
                      ) : (
                        <p className="book-modal__empty">{bookStrings.modal.flow.profileHint}</p>
                      )}
                    </section>

                    <section className="book-modal__section">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.notes}
                      </h3>
                      <p className="book-modal__tz-note">{bookStrings.modal.flow.notesHint}</p>
                      <textarea
                        className="book-modal__notes"
                        placeholder={bookStrings.modal.notesPlaceholder}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </section>
                  </>
                )}

                {currentStep === 3 && selectedTimeValue && (
                  <>
                    <SlotSummary
                      title={bookStrings.modal.sections.confirmation}
                      tableNumber={table.public_number}
                      date={selectedDate.toLocaleDateString("uk-UA", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      time={selectedTimeValue}
                      endTime={endAt}
                      duration={effectiveDuration}
                      guests={guestCount}
                    />
                    <section className="book-modal__section book-modal__section--summary">
                      <h3 className="book-modal__section-title">
                        {bookStrings.modal.sections.contacts}
                      </h3>
                      <div className="book-modal__summary">
                        {showNameField && (
                          <div className="book-modal__summary-row">
                            <span>{bookStrings.modal.sections.guestName}</span>
                            <span>{guestName || "—"}</span>
                          </div>
                        )}
                        <div className="book-modal__summary-row">
                          <span>{bookStrings.modal.sections.notes}</span>
                          <span>{notes.trim() || bookStrings.modal.flow.notesFallback}</span>
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>

            {error && <p className="book-modal__error">{error}</p>}

            <div className="book-modal__actions">
              <button
                className="book-modal__btn book-modal__btn--cancel"
                onClick={currentStep === 0 ? onClose : handleBack}
                type="button"
              >
                {currentStep === 0 ? bookStrings.modal.actions.cancel : bookStrings.modal.flow.back}
              </button>
              <button
                className="book-modal__btn book-modal__btn--confirm"
                onClick={isLastStep ? handleConfirm : handleNext}
                disabled={isLastStep ? !canConfirm : !canGoNext || submitting}
                type="button"
              >
                {isLastStep
                  ? submitting
                    ? bookStrings.modal.actions.submitting
                    : bookStrings.modal.actions.confirm
                  : bookStrings.modal.flow.next}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
