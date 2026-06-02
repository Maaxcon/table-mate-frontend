import { useCallback, useMemo, useState } from "react"
import type { ReservationWithTable } from "./api"
import { cancelReservation, modifyReservation } from "./api"
import "./ActiveBookings.css"

interface ActiveBookingsProps {
  reservations: ReservationWithTable[]
  loading: boolean
  onRefresh: () => void
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  }
}

type TemporalPhase = "upcoming" | "in_progress" | "completed"

function getTemporalPhase(startAt: string, endAt: string): TemporalPhase {
  const now = new Date()
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (now < start) return "upcoming"
  if (now >= start && now <= end) return "in_progress"
  return "completed"
}

const PHASE_LABELS: Record<TemporalPhase, string> = {
  upcoming: "UPCOMING",
  in_progress: "IN PROGRESS",
  completed: "COMPLETED",
}

export function ActiveBookings({ reservations, loading, onRefresh }: ActiveBookingsProps) {
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editGuestCount, setEditGuestCount] = useState(2)

  const handleCancel = useCallback(
    async (publicId: string) => {
      setError(null)
      setActionId(publicId)
      try {
        await cancelReservation(publicId)
        onRefresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel")
      } finally {
        setActionId(null)
      }
    },
    [onRefresh],
  )

  const startEdit = useCallback((r: ReservationWithTable) => {
    setEditingId(r.public_id)
    setEditGuestCount(r.guest_count)
    setError(null)
  }, [])

  const handleModify = useCallback(
    async (publicId: string) => {
      setError(null)
      setActionId(publicId)
      try {
        await modifyReservation(publicId, { guest_count: editGuestCount })
        setEditingId(null)
        onRefresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to modify")
      } finally {
        setActionId(null)
      }
    },
    [editGuestCount, onRefresh],
  )

  const { upcoming, inProgress, completed, archived } = useMemo(() => {
    const active = reservations.filter((r) => r.status === "active")
    const cancelled = reservations.filter((r) => r.status === "cancelled")
    return {
      upcoming: active.filter((r) => getTemporalPhase(r.start_at, r.end_at) === "upcoming"),
      inProgress: active.filter((r) => getTemporalPhase(r.start_at, r.end_at) === "in_progress"),
      completed: active.filter((r) => getTemporalPhase(r.start_at, r.end_at) === "completed"),
      archived: cancelled,
    }
  }, [reservations])

  const hasActive = upcoming.length > 0 || inProgress.length > 0

  if (loading) {
    return <div className="ab-loading">LOADING...</div>
  }

  return (
    <div className="ab">
      <h2 className="ab__title">MY BOOKINGS</h2>

      {error && <p className="ab__error">{error}</p>}

      {!hasActive && completed.length === 0 && archived.length === 0 && (
        <p className="ab__empty">No bookings yet.</p>
      )}

      {upcoming.length > 0 && (
        <div className="ab__list">
          {upcoming.map((r) => {
            const dt = formatDateTime(r.start_at)
            const endDt = formatDateTime(r.end_at)
            const isEditing = editingId === r.public_id
            const isBusy = actionId === r.public_id

            return (
              <div key={r.public_id} className="ab__card">
                <div className="ab__card-header">
                  <span className="ab__card-table">
                    TABLE {r.table_info?.table_number ?? r.table}
                  </span>
                  <span className="ab__card-status ab__card-status--upcoming">
                    {PHASE_LABELS.upcoming}
                  </span>
                </div>

                <div className="ab__card-body">
                  <div className="ab__card-row">
                    <span className="ab__card-label">Date</span>
                    <span className="ab__card-value">{dt.date}</span>
                  </div>
                  <div className="ab__card-row">
                    <span className="ab__card-label">Time</span>
                    <span className="ab__card-value">
                      {dt.time} &ndash; {endDt.time}
                    </span>
                  </div>
                  <div className="ab__card-row">
                    <span className="ab__card-label">Guests</span>
                    {isEditing ? (
                      <div className="ab__edit-guests">
                        <button
                          type="button"
                          className="ab__edit-btn"
                          onClick={() => setEditGuestCount((g) => Math.max(1, g - 1))}
                          disabled={editGuestCount <= 1}
                        >
                          &minus;
                        </button>
                        <span className="ab__edit-count">{editGuestCount}</span>
                        <button
                          type="button"
                          className="ab__edit-btn"
                          onClick={() => setEditGuestCount((g) => g + 1)}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="ab__card-value">{r.guest_count}</span>
                    )}
                  </div>
                </div>

                <div className="ab__card-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="ab__action ab__action--save"
                        onClick={() => handleModify(r.public_id)}
                        disabled={isBusy}
                        type="button"
                      >
                        {isBusy ? "SAVING..." : "SAVE"}
                      </button>
                      <button
                        className="ab__action ab__action--cancel"
                        onClick={() => setEditingId(null)}
                        disabled={isBusy}
                        type="button"
                      >
                        BACK
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="ab__action ab__action--edit"
                        onClick={() => startEdit(r)}
                        disabled={isBusy}
                        type="button"
                      >
                        MODIFY
                      </button>
                      <button
                        className="ab__action ab__action--cancel"
                        onClick={() => handleCancel(r.public_id)}
                        disabled={isBusy}
                        type="button"
                      >
                        {isBusy ? "CANCELLING..." : "CANCEL"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {inProgress.length > 0 && (
        <>
          <h3 className="ab__subtitle">IN PROGRESS</h3>
          <div className="ab__list">
            {inProgress.map((r) => {
              const dt = formatDateTime(r.start_at)
              const endDt = formatDateTime(r.end_at)
              return (
                <div key={r.public_id} className="ab__card">
                  <div className="ab__card-header">
                    <span className="ab__card-table">
                      TABLE {r.table_info?.table_number ?? r.table}
                    </span>
                    <span className="ab__card-status ab__card-status--in-progress">
                      {PHASE_LABELS.in_progress}
                    </span>
                  </div>
                  <div className="ab__card-body">
                    <div className="ab__card-row">
                      <span className="ab__card-label">Date</span>
                      <span className="ab__card-value">{dt.date}</span>
                    </div>
                    <div className="ab__card-row">
                      <span className="ab__card-label">Time</span>
                      <span className="ab__card-value">
                        {dt.time} &ndash; {endDt.time}
                      </span>
                    </div>
                    <div className="ab__card-row">
                      <span className="ab__card-label">Guests</span>
                      <span className="ab__card-value">{r.guest_count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <h3 className="ab__subtitle">COMPLETED</h3>
          <div className="ab__list">
            {completed.map((r) => {
              const dt = formatDateTime(r.start_at)
              return (
                <div key={r.public_id} className="ab__card ab__card--archived">
                  <div className="ab__card-header">
                    <span className="ab__card-table">
                      TABLE {r.table_info?.table_number ?? r.table}
                    </span>
                    <span className="ab__card-status ab__card-status--completed">
                      {PHASE_LABELS.completed}
                    </span>
                  </div>
                  <div className="ab__card-body">
                    <div className="ab__card-row">
                      <span className="ab__card-label">Date</span>
                      <span className="ab__card-value">{dt.date}</span>
                    </div>
                    <div className="ab__card-row">
                      <span className="ab__card-label">Time</span>
                      <span className="ab__card-value">{dt.time}</span>
                    </div>
                    <div className="ab__card-row">
                      <span className="ab__card-label">Guests</span>
                      <span className="ab__card-value">{r.guest_count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <>
          <h3 className="ab__subtitle">CANCELLED</h3>
          <div className="ab__list">
            {archived.map((r) => {
              const dt = formatDateTime(r.start_at)
              return (
                <div key={r.public_id} className="ab__card ab__card--archived">
                  <div className="ab__card-header">
                    <span className="ab__card-table">
                      TABLE {r.table_info?.table_number ?? r.table}
                    </span>
                    <span className="ab__card-status ab__card-status--archived">CANCELLED</span>
                  </div>
                  <div className="ab__card-body">
                    <div className="ab__card-row">
                      <span className="ab__card-label">Date</span>
                      <span className="ab__card-value">{dt.date}</span>
                    </div>
                    <div className="ab__card-row">
                      <span className="ab__card-label">Time</span>
                      <span className="ab__card-value">{dt.time}</span>
                    </div>
                    <div className="ab__card-row">
                      <span className="ab__card-label">Guests</span>
                      <span className="ab__card-value">{r.guest_count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
