import { useState } from "react"
import { LuUtensilsCrossed } from "react-icons/lu"
import type { ReservationItem } from "../../types"
import { formatTimeRange } from "../../types"
import { ConfirmCancelModal } from "../ConfirmCancelModal"
import "./ReservationSidebar.css"
import { useWaiterStrings } from "../../strings"

interface ReservationSidebarProps {
  reservations: ReservationItem[]
  onCancel: (reservationId: string) => void
  onModify: (reservation: ReservationItem) => void
  actionLoading: boolean
  error?: string | null
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
  const sidebarStrings = useWaiterStrings().reservations.sidebar

  const getReservationStatusLabel = (status?: ReservationItem["status"]) => {
    if (!status) return sidebarStrings.status.unknown
    const key = status.toLowerCase() as keyof typeof sidebarStrings.status
    return sidebarStrings.status[key] ?? sidebarStrings.status.unknown
  }

  const sorted = [...reservations].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  )

  const filtered = sorted.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <aside className="reservation-sidebar">
      <div className="reservation-sidebar__header">
        <h2 className="reservation-sidebar__title">{sidebarStrings.title}</h2>
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
          placeholder={sidebarStrings.searchPlaceholder}
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
                <span className="reservation-sidebar__item-name">
                  {r.name}
                  {r.has_preorder && (
                    <LuUtensilsCrossed
                      className="reservation-sidebar__preorder-badge"
                      size={13}
                      title={sidebarStrings.preorderBadge}
                      aria-label={sidebarStrings.preorderBadge}
                    />
                  )}
                </span>
                <span className="reservation-sidebar__item-meta">
                  {sidebarStrings.guestCount(r.guest_count)}
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
                  {sidebarStrings.actions.modify}
                </button>
                <button
                  type="button"
                  className="reservation-sidebar__action-btn reservation-sidebar__action-btn--cancel"
                  onClick={() => setConfirmingId(r.public_id)}
                  disabled={actionLoading}
                >
                  {sidebarStrings.actions.cancel}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirmingId && (
        <ConfirmCancelModal
          title={sidebarStrings.confirm.title}
          message={sidebarStrings.confirm.message}
          confirmLabel={sidebarStrings.confirm.confirm}
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
