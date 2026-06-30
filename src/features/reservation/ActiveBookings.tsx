import { useCallback, useEffect, useMemo, useState } from "react"
import { LuCalendarPlus, LuClock, LuPencil, LuUsers, LuX } from "react-icons/lu"
import type { ReservationStatus, ReservationWithTable, WorkingHoursDay } from "./api"
import { cancelReservation, fetchMyReservations } from "./api"
import { BookingsSkeleton } from "./BookingSkeleton"
import { CancellationConfirmationModal } from "./CancellationConfirmationModal"
import { RescheduleModal } from "./RescheduleModal"
import { bookStrings } from "./strings"
import "./ActiveBookings.css"

interface ActiveBookingsProps {
  reservations: ReservationWithTable[]
  loading: boolean
  workingHours: Record<string, WorkingHoursDay> | null
  timeZone: string | null
  restaurantId?: string
  onRefresh: () => void
  onBrowseTables?: () => void
}

// All times are formatted in the restaurant's timezone (not the browser's), so a
// guest in another zone still sees the correct local booking time.
function dateParts(iso: string, timeZone: string | null) {
  const d = new Date(iso)
  const tz = timeZone ?? undefined
  return {
    day: d.toLocaleDateString("uk-UA", { timeZone: tz, day: "numeric" }),
    month: d.toLocaleDateString("uk-UA", { timeZone: tz, month: "short" }).replace(".", ""),
    weekday: d.toLocaleDateString("uk-UA", { timeZone: tz, weekday: "short" }),
  }
}

function formatTime(iso: string, timeZone: string | null) {
  return new Date(iso).toLocaleTimeString("uk-UA", {
    timeZone: timeZone ?? undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

type TemporalPhase = "upcoming" | "in_progress" | "past"

function getTemporalPhase(startAt: string, endAt: string): TemporalPhase {
  const now = new Date()
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (now < start) return "upcoming"
  if (now >= start && now <= end) return "in_progress"
  return "past"
}

const PHASE_LABELS: Record<TemporalPhase, string> = bookStrings.myBookings.phase

const STATUS_ORDER: ReservationStatus[] = ["pending", "active"]

const STATUS_LABELS: Record<ReservationStatus, string> = bookStrings.myBookings.status

const byStartAsc = (a: ReservationWithTable, b: ReservationWithTable) =>
  new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
const byStartDesc = (a: ReservationWithTable, b: ReservationWithTable) =>
  new Date(b.start_at).getTime() - new Date(a.start_at).getTime()

export function ActiveBookings({
  reservations,
  loading,
  workingHours,
  timeZone,
  restaurantId,
  onRefresh,
  onBrowseTables,
}: ActiveBookingsProps) {
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<ReservationWithTable | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationWithTable | null>(null)
  const [showPast, setShowPast] = useState(false)

  // History (completed/cancelled) is a separate, lazy-loaded list: the /my/
  // endpoint only returns active bookings unless asked for ?status=past.
  const [pastItems, setPastItems] = useState<ReservationWithTable[]>([])

  const loadPast = useCallback(() => {
    fetchMyReservations(restaurantId, "past")
      .then((data) => setPastItems([...data].sort(byStartDesc)))
      .catch(() => setPastItems([]))
  }, [restaurantId])

  useEffect(() => {
    loadPast()
  }, [loadPast])

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return
    setError(null)
    setActionId(cancelTarget.public_id)
    try {
      await cancelReservation(cancelTarget.public_id)
      setCancelTarget(null)
      onRefresh()
      loadPast()
    } catch (err) {
      setError(err instanceof Error ? err.message : bookStrings.myBookings.cancelFailed)
    } finally {
      setActionId(null)
    }
  }, [cancelTarget, onRefresh, loadPast])

  const byStatus = useMemo(() => {
    const grouped: Record<string, ReservationWithTable[]> = {}
    for (const s of STATUS_ORDER) {
      const bucket = reservations.filter((r) => r.status === s)
      if (bucket.length === 0) continue
      grouped[s] = bucket.sort(byStartAsc)
    }
    return grouped
  }, [reservations])

  const hasActive = Object.keys(byStatus).length > 0
  const hasPast = pastItems.length > 0

  // Only flag the timezone when the guest's device clock differs from the venue.
  const foreignTz = useMemo(() => {
    if (!timeZone) return null
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return browserTz === timeZone ? null : timeZone
  }, [timeZone])

  const renderCard = useCallback(
    (r: ReservationWithTable, statusKey: ReservationStatus, withActions: boolean) => {
      const dp = dateParts(r.start_at, timeZone)
      const startTime = formatTime(r.start_at, timeZone)
      const endTime = formatTime(r.end_at, timeZone)
      const isBusy = actionId === r.public_id
      const phase = getTemporalPhase(r.start_at, r.end_at)

      return (
        <article key={r.public_id} className={`ab__card${withActions ? "" : " ab__card--past"}`}>
          <div className={`ab__date ab__date--${statusKey}`}>
            <span className="ab__date-month">{dp.month}</span>
            <span className="ab__date-day">{dp.day}</span>
            <span className="ab__date-weekday">{dp.weekday}</span>
          </div>

          <div className="ab__card-main">
            <div className="ab__card-top">
              <span className="ab__card-table">
                {bookStrings.myBookings.card.table(r.table_info?.table_number ?? r.table)}
              </span>
              <span className={`ab__card-status ab__card-status--${statusKey}`}>
                {STATUS_LABELS[statusKey]}
              </span>
            </div>

            <div className="ab__card-meta">
              <span className="ab__meta">
                <LuClock aria-hidden="true" />
                {startTime}&ndash;{endTime}
              </span>
              <span className="ab__meta">
                <LuUsers aria-hidden="true" />
                {r.guest_count}
              </span>
              {withActions && phase !== "past" && statusKey === "active" && (
                <span className="ab__meta ab__meta--phase">{PHASE_LABELS[phase]}</span>
              )}
            </div>

            {withActions && (
              <div className="ab__card-actions">
                <button
                  className="ab__action ab__action--edit"
                  onClick={() => setRescheduleTarget(r)}
                  disabled={isBusy}
                  type="button"
                >
                  <LuPencil aria-hidden="true" />
                  {bookStrings.myBookings.actions.modify}
                </button>
                <button
                  className="ab__action ab__action--cancel"
                  onClick={() => setCancelTarget(r)}
                  disabled={isBusy}
                  type="button"
                >
                  <LuX aria-hidden="true" />
                  {isBusy
                    ? bookStrings.myBookings.actions.cancelling
                    : bookStrings.myBookings.actions.cancel}
                </button>
              </div>
            )}
          </div>
        </article>
      )
    },
    [actionId, timeZone],
  )

  if (loading) {
    return <BookingsSkeleton />
  }

  return (
    <div className="ab">
      <h2 className="ab__title">{bookStrings.myBookings.title}</h2>

      {error && <p className="ab__error">{error}</p>}

      {foreignTz && (hasActive || hasPast) && (
        <p className="ab__tznote">{bookStrings.myBookings.tzNote(foreignTz)}</p>
      )}

      {!hasActive && !hasPast && (
        <div className="ab__empty-state">
          <p className="ab__empty">{bookStrings.myBookings.empty}</p>
          {onBrowseTables && (
            <button type="button" className="ab__empty-cta" onClick={onBrowseTables}>
              <LuCalendarPlus aria-hidden="true" />
              {bookStrings.myBookings.emptyCta}
            </button>
          )}
        </div>
      )}

      {rescheduleTarget && (
        <RescheduleModal
          publicId={rescheduleTarget.public_id}
          tableNumber={rescheduleTarget.table_info?.table_number ?? rescheduleTarget.table}
          tablePublicId={rescheduleTarget.table_info?.public_id ?? rescheduleTarget.table}
          restaurantId={rescheduleTarget.restaurant}
          currentDate={rescheduleTarget.start_at}
          currentStart={rescheduleTarget.start_at}
          currentEnd={rescheduleTarget.end_at}
          currentGuests={rescheduleTarget.guest_count}
          tableCapacity={rescheduleTarget.table_info?.capacity ?? 10}
          workingHours={workingHours}
          timeZone={timeZone}
          endTimeOnly={rescheduleTarget.status === "active"}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={onRefresh}
        />
      )}

      {cancelTarget && (
        <CancellationConfirmationModal
          isSubmitting={actionId === cancelTarget.public_id}
          onConfirm={() => void handleCancel()}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {STATUS_ORDER.map((statusKey) => {
        const items = byStatus[statusKey]
        if (!items) return null
        return (
          <div key={statusKey}>
            <h3 className="ab__subtitle">{STATUS_LABELS[statusKey]}</h3>
            <div className="ab__list">{items.map((r) => renderCard(r, statusKey, true))}</div>
          </div>
        )
      })}

      {hasPast && (
        <div className="ab__past">
          <button
            type="button"
            className="ab__past-toggle"
            onClick={() => setShowPast((s) => !s)}
            aria-expanded={showPast}
          >
            {showPast
              ? bookStrings.myBookings.pastHide
              : bookStrings.myBookings.pastShow(pastItems.length)}
          </button>
          {showPast && (
            <div className="ab__list">{pastItems.map((r) => renderCard(r, r.status, false))}</div>
          )}
        </div>
      )}
    </div>
  )
}
