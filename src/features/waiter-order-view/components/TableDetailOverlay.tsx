import { useState } from "react"
import type { FloorTable, ReservationItem, OverlayDetail } from "../data/mockData"
import { OrderItemRow } from "./OrderItemRow"
import "./TableDetailOverlay.css"

interface TableDetailOverlayProps {
  table: FloorTable
  detail: OverlayDetail | null
  tableReservations: ReservationItem[]
  onClose: () => void
}

export function TableDetailOverlay({
  table,
  detail,
  tableReservations,
  onClose,
}: TableDetailOverlayProps) {
  const isOccupied = table.status === "occupied"
  const [activeOverlayTab, setActiveOverlayTab] = useState<"order" | "reservations">(
    isOccupied ? "order" : "reservations",
  )
  const guestSlots = detail ? [...new Set(detail.items.map((i) => i.guest_slot))].sort() : []
  const nearestReservation =
    tableReservations.length > 0
      ? tableReservations.sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        )[0]
      : null

  return (
    <>
      <div
        className="overlay-backdrop"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close table detail overlay"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClose()
        }}
      />
      <div className="overlay">
        <div className="overlay__header">
          <div className="overlay__header-top">
            <h2 className="overlay__title">TABLE {table.table_number}</h2>
            <button type="button" className="overlay__close" onClick={onClose} aria-label="Close">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="overlay__subtitle">
            {isOccupied && detail
              ? `Current Party: ${detail.guest_name} • ${detail.guest_count} Guests • Duration: ${detail.duration}`
              : nearestReservation
                ? `Capacity: ${table.capacity} • Next: ${nearestReservation.name} at ${new Date(nearestReservation.start_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", hour12: false })}`
                : `Capacity: ${table.capacity} • Available`}
          </p>
        </div>

        <div className="overlay__tabs">
          {isOccupied && (
            <button
              type="button"
              className={`overlay__tab ${activeOverlayTab === "order" ? "overlay__tab--active" : ""}`}
              onClick={() => setActiveOverlayTab("order")}
            >
              ORDER
            </button>
          )}
          <button
            type="button"
            className={`overlay__tab ${activeOverlayTab === "reservations" ? "overlay__tab--active" : ""}`}
            onClick={() => setActiveOverlayTab("reservations")}
          >
            RESERVATIONS
          </button>
        </div>

        {activeOverlayTab === "order" && detail && (
          <>
            <div className="overlay__actions">
              <button type="button" className="overlay__action-btn">
                ADD ITEM
              </button>
              <button type="button" className="overlay__action-btn">
                MOVE TABLE
              </button>
              <button type="button" className="overlay__action-btn">
                CLOSE CHECK
              </button>
            </div>

            <div className="overlay__divider" />

            <div className="overlay__body">
              {guestSlots.map((slot) => {
                const slotItems = detail.items.filter((i) => i.guest_slot === slot)
                return (
                  <div key={slot} className="overlay__slot">
                    <h3 className="overlay__slot-title">GUEST {slot}</h3>
                    {slotItems.map((item) => (
                      <OrderItemRow key={item.public_id} item={item} />
                    ))}
                  </div>
                )
              })}
            </div>

            <div className="overlay__divider" />

            <div className="overlay__footer">
              <div className="overlay__total-row">
                <span className="overlay__total-label">SUBTOTAL</span>
                <span className="overlay__total-value">&euro;{detail.subtotal}</span>
              </div>
              <div className="overlay__total-row">
                <span className="overlay__total-label">TAX</span>
                <span className="overlay__total-value">&euro;{detail.tax_total}</span>
              </div>
              <div className="overlay__total-row overlay__total-row--final">
                <span className="overlay__total-label overlay__total-label--large">TOTAL</span>
                <span className="overlay__total-value overlay__total-value--large">
                  &euro;{detail.total_amount}
                </span>
              </div>
              <button type="button" className="overlay__cta">
                PROCESS PAYMENT
              </button>
            </div>
          </>
        )}

        {activeOverlayTab === "reservations" && (
          <div className="overlay__body">
            {tableReservations.length === 0 ? (
              <p className="overlay__empty">No reservations for this table.</p>
            ) : (
              tableReservations.map((r) => (
                <div key={r.public_id} className="overlay__reservation-row">
                  <div className="overlay__reservation-info">
                    <span className="overlay__reservation-name">{r.name}</span>
                    <span className="overlay__reservation-meta">
                      {r.guest_count} guests &middot;{" "}
                      {new Date(r.start_at).toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  )
}
