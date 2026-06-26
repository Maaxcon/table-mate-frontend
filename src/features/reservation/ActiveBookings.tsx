import { useCallback, useMemo, useState } from "react"
import { LuClock, LuPencil, LuUsers, LuX } from "react-icons/lu"
import type { ReservationStatus, ReservationWithTable, WorkingHoursDay } from "./api"
import { cancelReservation } from "./api"
import { CancellationConfirmationModal } from "./CancellationConfirmationModal"
import { RescheduleModal } from "./RescheduleModal"
import { bookStrings } from "./strings"
import "./ActiveBookings.css"

interface ActiveBookingsProps {
  reservations: ReservationWithTable[]
  loading: boolean
  workingHours: Record<string, WorkingHoursDay> | null
  timeZone: string | null
  onRefresh: () => void
}

function dateParts(iso: string) {
  const d = new Date(iso)
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("uk-UA", { month: "short" }).replace(".", ""),
    weekday: d.toLocaleDateString("uk-UA", { weekday: "short" }),
  }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString("uk-UA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  }
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

export function ActiveBookings({
  reservations,
  loading,
  workingHours,
  timeZone,
  onRefresh,
}: ActiveBookingsProps) {
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<ReservationWithTable | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationWithTable | null>(null)

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return
    setError(null)
    setActionId(cancelTarget.public_id)
    try {
      await cancelReservation(cancelTarget.public_id)
      setCancelTarget(null)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : bookStrings.myBookings.cancelFailed)
    } finally {
      setActionId(null)
    }
  }, [cancelTarget, onRefresh])

  const { byStatus } = useMemo(() => {
    const grouped: Record<string, ReservationWithTable[]> = {}
    for (const s of STATUS_ORDER) {
      const bucket = reservations.filter((r) => r.status === s)
      if (bucket.length === 0) continue
      grouped[s] = bucket
    }
    return { byStatus: grouped }
  }, [reservations])

  const hasItems = Object.keys(byStatus).length > 0

  if (loading) {
    return <div className="ab__loading">{bookStrings.loading}</div>
  }

  return (
    <div className="ab">
      <h2 className="ab__title">{bookStrings.myBookings.title}</h2>

      {error && <p className="ab__error">{error}</p>}

      {!hasItems && <p className="ab__empty">{bookStrings.myBookings.empty}</p>}

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

        const canModify = statusKey === "pending" || statusKey === "active"

        return (
          <div key={statusKey}>
            <h3 className="ab__subtitle">{STATUS_LABELS[statusKey]}</h3>
            <div className="ab__list">
              {items.map((r) => {
                const dt = formatDateTime(r.start_at)
                const endDt = formatDateTime(r.end_at)
                const dp = dateParts(r.start_at)
                const isBusy = actionId === r.public_id
                const phase = getTemporalPhase(r.start_at, r.end_at)

                return (
                  <article key={r.public_id} className="ab__card">
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
                          {dt.time}&ndash;{endDt.time}
                        </span>
                        <span className="ab__meta">
                          <LuUsers aria-hidden="true" />
                          {r.guest_count}
                        </span>
                        {phase !== "past" && statusKey === "active" && (
                          <span className="ab__meta ab__meta--phase">{PHASE_LABELS[phase]}</span>
                        )}
                      </div>

                      {canModify && (
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
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
