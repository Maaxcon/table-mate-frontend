import type { ReservationItem } from "../data/mockData"
import "./ReservationSidebar.css"

interface ReservationSidebarProps {
  reservations: ReservationItem[]
}

export function ReservationSidebar({ reservations }: ReservationSidebarProps) {
  return (
    <aside className="reservation-sidebar">
      <div className="reservation-sidebar__header">
        <h2 className="reservation-sidebar__title">NEXT RESERVATIONS</h2>
        <button type="button" className="reservation-sidebar__add" aria-label="Add reservation">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
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
        />
      </div>

      <div className="reservation-sidebar__list">
        {reservations.map((r, i) => (
          <div
            key={r.id}
            className={`reservation-sidebar__item ${i < reservations.length - 1 ? "reservation-sidebar__item--bordered" : ""}`}
          >
            <div className="reservation-sidebar__item-left">
              <span className="reservation-sidebar__item-time">{r.time}</span>
              <div className="reservation-sidebar__item-info">
                <span className="reservation-sidebar__item-name">{r.name}</span>
                <span className="reservation-sidebar__item-meta">
                  {r.guests} GUESTS{r.vip ? " \u2022 VIP ACCESS" : ""}
                </span>
              </div>
            </div>
            <span className="reservation-sidebar__item-table">
              T-{r.table.replace("T-", "").padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>

      <button type="button" className="reservation-sidebar__action">
        GENERATE SHIFT REPORT
      </button>
    </aside>
  )
}
