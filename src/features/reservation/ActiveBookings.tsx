import { useCallback, useMemo, useState } from "react"
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
                const isBusy = actionId === r.public_id
                const phase = getTemporalPhase(r.start_at, r.end_at)

                return (
                  <div key={r.public_id} className="ab__card">
                    <div className="ab__card-header">
                      <span className="ab__card-table">
                        {bookStrings.myBookings.card.table(r.table_info?.table_number ?? r.table)}
                      </span>
                      <span className={`ab__card-status ab__card-status--${statusKey}`}>
                        {STATUS_LABELS[statusKey]}
                      </span>
                    </div>

                    <div className="ab__card-body">
                      <div className="ab__card-row">
                        <span className="ab__card-label">{bookStrings.myBookings.card.date}</span>
                        <span className="ab__card-value">{dt.date}</span>
                      </div>
                      <div className="ab__card-row">
                        <span className="ab__card-label">{bookStrings.myBookings.card.time}</span>
                        <span className="ab__card-value">
                          {dt.time} &ndash; {endDt.time}
                        </span>
                      </div>
                      <div className="ab__card-row">
                        <span className="ab__card-label">{bookStrings.myBookings.card.guests}</span>
                        <span className="ab__card-value">{r.guest_count}</span>
                      </div>
                      {phase !== "past" && statusKey === "active" && (
                        <div className="ab__card-row">
                          <span className="ab__card-label">
                            {bookStrings.myBookings.card.phase}
                          </span>
                          <span className="ab__card-value">{PHASE_LABELS[phase]}</span>
                        </div>
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
                          {bookStrings.myBookings.actions.modify}
                        </button>
                        <button
                          className={["ab__action", "ab__action--cancel"].filter(Boolean).join(" ")}
                          onClick={() => setCancelTarget(r)}
                          disabled={isBusy}
                          type="button"
                        >
                          {isBusy
                            ? bookStrings.myBookings.actions.cancelling
                            : bookStrings.myBookings.actions.cancel}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
