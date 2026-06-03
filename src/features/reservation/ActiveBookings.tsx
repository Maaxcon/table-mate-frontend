import { useCallback, useMemo, useState } from "react"
import type { ReservationStatus, ReservationWithTable } from "./api"
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

type TemporalPhase = "upcoming" | "in_progress" | "past"

function getTemporalPhase(startAt: string, endAt: string): TemporalPhase {
  const now = new Date()
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (now < start) return "upcoming"
  if (now >= start && now <= end) return "in_progress"
  return "past"
}

const PHASE_LABELS: Record<TemporalPhase, string> = {
  upcoming: "UPCOMING",
  in_progress: "IN PROGRESS",
  past: "PAST",
}

const STATUS_ORDER: ReservationStatus[] = ["pending", "active", "completed", "cancelled"]

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "PENDING",
  active: "ACTIVE",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
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
    return <div className="ab-loading">LOADING...</div>
  }

  return (
    <div className="ab">
      <h2 className="ab__title">MY BOOKINGS</h2>

      {error && <p className="ab__error">{error}</p>}

      {!hasItems && <p className="ab__empty">No bookings yet.</p>}

      {STATUS_ORDER.map((statusKey) => {
        const items = byStatus[statusKey]
        if (!items) return null

        const isCancelled = statusKey === "cancelled"
        const isPast = statusKey === "completed"

        return (
          <div key={statusKey}>
            <h3 className="ab__subtitle">{STATUS_LABELS[statusKey]}</h3>
            <div className="ab__list">
              {items.map((r) => {
                const dt = formatDateTime(r.start_at)
                const endDt = formatDateTime(r.end_at)
                const isEditing = editingId === r.public_id
                const isBusy = actionId === r.public_id
                const phase = getTemporalPhase(r.start_at, r.end_at)

                return (
                  <div
                    key={r.public_id}
                    className={["ab__card", isCancelled || isPast ? "ab__card--archived" : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="ab__card-header">
                      <span className="ab__card-table">
                        TABLE {r.table_info?.table_number ?? r.table}
                      </span>
                      <span
                        className={[
                          "ab__card-status",
                          `ab__card-status--${statusKey === "cancelled" ? "archived" : statusKey}`,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {STATUS_LABELS[statusKey]}
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
                      {phase !== "past" && statusKey === "active" && (
                        <div className="ab__card-row">
                          <span className="ab__card-label">Phase</span>
                          <span className="ab__card-value">{PHASE_LABELS[phase]}</span>
                        </div>
                      )}
                    </div>

                    {(statusKey === "pending" || statusKey === "active") && (
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
