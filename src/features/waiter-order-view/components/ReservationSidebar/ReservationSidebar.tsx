import { useState } from "react"
import type { ReservationItem } from "../../types"
import { formatTimeRange } from "../../types"
import { ConfirmCancelModal } from "../ConfirmCancelModal"
import "./ReservationSidebar.css"

interface ReservationSidebarProps {
  reservations: ReservationItem[]
  onCancel: (reservationId: string) => void
  onModify: (reservation: ReservationItem) => void
  actionLoading: boolean
  error?: string | null
}

const STATUS_LABELS = {
  pending: "PENDING",
  active: "ACTIVE",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
} as const

function getReservationStatusLabel(status?: ReservationItem["status"]) {
  if (!status) return "UNKNOWN"
  const key = status.toLowerCase() as keyof typeof STATUS_LABELS
  return STATUS_LABELS[key] ?? status.replace(/_/g, " ").toUpperCase()
}

export function ReservationSidebar({
  reservations,
  onCancel,
  onModify,
  actionLoading,
  error = null,
}: ReservationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const sorted = [...reservations].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  )

  const filtered = sorted.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <aside className="reservation-sidebar">
      <div className="reservation-sidebar__header">
        <h2 className="reservation-sidebar__title">NEXT RESERVATIONS</h2>
      </div>

      <div className="reservation-sidebar__search">
        <svg
          className="reservation-sidebar__search-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="reservation-sidebar__search-input"
          placeholder="SEARCH GUESTS..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <p className="reservation-sidebar__error" role="alert">
          {error}
        </p>
      )}

      <div className="reservation-sidebar__list">
        {filtered.map((r, i) => (
          <div
            key={r.public_id}
            className={`reservation-sidebar__item ${i < filtered.length - 1 ? "reservation-sidebar__item--bordered" : ""}`}
          >
            <div className="reservation-sidebar__item-left">
              <span className="reservation-sidebar__item-time">
                {formatTimeRange(r.start_at, r.end_at)}
              </span>
              <div className="reservation-sidebar__item-info">
                <span className="reservation-sidebar__item-name">{r.name}</span>
                <span className="reservation-sidebar__item-meta">
                  {r.guest_count} GUESTS
                  <span
                    className={`reservation-sidebar__item-status reservation-sidebar__item-status--${(r.status ?? "unknown").toLowerCase()}`}
                  >
                    {getReservationStatusLabel(r.status)}
                  </span>
                </span>
              </div>
            </div>
            <div className="reservation-sidebar__item-right">
              <span className="reservation-sidebar__item-table">{r.table}</span>
              <div className="reservation-sidebar__item-actions">
                <button
                  type="button"
                  className="reservation-sidebar__action-btn reservation-sidebar__action-btn--modify"
                  onClick={() => onModify(r)}
                  disabled={actionLoading}
                >
                  MODIFY
                </button>
                <button
                  type="button"
                  className="reservation-sidebar__action-btn reservation-sidebar__action-btn--cancel"
                  onClick={() => setConfirmingId(r.public_id)}
                  disabled={actionLoading}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="reservation-sidebar__action">
        GENERATE SHIFT REPORT
      </button>

      {confirmingId && (
        <ConfirmCancelModal
          title="Cancel Reservation"
          message="Are you sure you want to cancel this reservation? This action cannot be undone."
          confirmLabel="Cancel Reservation"
          busy={actionLoading}
          onConfirm={() => {
            onCancel(confirmingId)
            setConfirmingId(null)
          }}
          onClose={() => setConfirmingId(null)}
        />
      )}
    </aside>
  )
}
