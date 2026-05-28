import { getTimeFromDatetime } from "../data/mockData"
import type { ReservationItem } from "../data/mockData"
import "./ReservationsView.css"

interface ReservationsViewProps {
  reservations: ReservationItem[]
}

export function ReservationsView({ reservations }: ReservationsViewProps) {
  return (
    <div className="reservations-view">
      <h2 className="reservations-view__title">ALL RESERVATIONS</h2>
      <div className="reservations-view__list">
        {reservations.map((r) => (
          <div key={r.public_id} className="reservations-view__item">
            <div className="reservations-view__item-left">
              <span className="reservations-view__item-time">
                {getTimeFromDatetime(r.start_at)}
              </span>
              <div className="reservations-view__item-info">
                <span className="reservations-view__item-name">{r.name}</span>
                <span className="reservations-view__item-meta">
                  {r.guest_count} guests &middot; {r.notes ?? "No notes"}
                </span>
              </div>
            </div>
            <span className="reservations-view__item-table">T-{r.table.replace("T-", "")}</span>
          </div>
        ))}
        {reservations.length === 0 && (
          <p className="reservations-view__empty">No reservations for this shift.</p>
        )}
      </div>
    </div>
  )
}
