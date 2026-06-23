import { useState } from "react"
import type { ReservationItem } from "../data/waiterTypes"
import { formatTimeRange } from "../data/waiterTypes"
import "./ReservationSidebar.css"

interface ReservationSidebarProps {
  reservations: ReservationItem[]
  onCancel: (reservationId: string) => void
  onModify: (reservation: ReservationItem) => void
  actionLoading: boolean
}

export function ReservationSidebar({
  reservations,
  onCancel,
  onModify,
  actionLoading,
}: ReservationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

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
                <span className="reservation-sidebar__item-meta">{r.guest_count} GUESTS</span>
              </div>
            </div>
            <div className="reservation-sidebar__item-right">
              <span className="reservation-sidebar__item-table">
                T-{r.table.replace("T-", "").padStart(2, "0")}
              </span>
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
                  onClick={() => onCancel(r.public_id)}
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
    </aside>
  )
}
