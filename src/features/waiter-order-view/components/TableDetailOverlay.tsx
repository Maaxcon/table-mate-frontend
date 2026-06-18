import { useState } from "react"
import { formatTimeRange } from "../data/waiterTypes"
import type {
  FloorTable,
  ReservationItem,
  OverlayDetail,
  VisualTableStatus,
} from "../data/waiterTypes"
import { OrderItemRow } from "./OrderItemRow"
import { CloseCheckModal } from "./CloseCheckModal"
import "./TableDetailOverlay.css"

interface TableDetailOverlayProps {
  table: FloorTable
  detail: OverlayDetail | null
  tableReservations: ReservationItem[]
  visualStatus: VisualTableStatus
  loading: boolean
  currentTime: Date
  actionBusy?: boolean
  actionError?: string | null
  onOpenTable?: (guestCount: number) => void
  onActivateReservation?: (reservationId: string) => void
  onCloseCheck?: () => void
  onClose: () => void
}

export function TableDetailOverlay({
  table,
  detail,
  tableReservations,
  visualStatus,
  loading,
  currentTime,
  actionBusy = false,
  actionError = null,
  onOpenTable,
  onActivateReservation,
  onCloseCheck,
  onClose,
}: TableDetailOverlayProps) {
  const isOccupied = visualStatus === "occupied"
  const isReserved = visualStatus === "reserved"
  const [activeOverlayTab, setActiveOverlayTab] = useState<"order" | "reservations">(
    isOccupied ? "order" : "reservations",
  )
  const [guestCount, setGuestCount] = useState(2)
  const [showCloseCheck, setShowCloseCheck] = useState(false)

  const guestSlots = detail
    ? [...new Set(detail.items.map((i) => i.guest_slot))].sort((a, b) => a - b)
    : []
  const byStart = (a: ReservationItem, b: ReservationItem) =>
    new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  const nearestReservation =
    tableReservations.length > 0 ? [...tableReservations].sort(byStart)[0] : null
  // The soonest booking that has not started yet — shown as the table's "next".
  const nextReservation =
    [...tableReservations]
      .filter((r) => new Date(r.start_at).getTime() > currentTime.getTime())
      .sort(byStart)[0] ?? null
  // Upcoming bookings only (pending) for the Reservations tab — the active party
  // already shows in the header, so we don't list it here too.
  const upcomingReservations = [...tableReservations]
    .filter((r) => r.status === "pending")
    .sort(byStart)

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
            {loading
              ? ""
              : isReserved
                ? `Reserved ${nearestReservation ? `• ${nearestReservation.name} ${formatTimeRange(nearestReservation.start_at, nearestReservation.end_at)}` : ""}`
                : isOccupied && detail
                  ? `Current Party: ${detail.guest_name} • ${detail.guest_count} Guests • Duration: ${detail.duration}${nextReservation ? ` • Next: ${nextReservation.name} ${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}` : ""}`
                  : nextReservation
                    ? `Capacity: ${table.capacity} • Next: ${nextReservation.name} ${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}`
                    : `Capacity: ${table.capacity} • Available`}
          </p>
        </div>

        {!isOccupied && !loading && (
          <div className="overlay__open-panel">
            {actionError && (
              <p className="overlay__action-error" role="alert">
                {actionError}
              </p>
            )}
            {tableReservations.some((r) => r.status === "pending") ? (
              <p className="overlay__open-hint">Seat a booked guest from the Reservations tab.</p>
            ) : (
              <div className="overlay__open-row">
                <label className="overlay__guests">
                  Guests
                  <input
                    type="number"
                    min={1}
                    className="overlay__guests-input"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                    disabled={actionBusy}
                  />
                </label>
                <button
                  type="button"
                  className="overlay__cta"
                  disabled={actionBusy}
                  onClick={() => onOpenTable?.(guestCount)}
                >
                  {actionBusy ? "OPENING…" : "OPEN TABLE"}
                </button>
              </div>
            )}
          </div>
        )}

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

        {loading && (
          <div className="overlay__skeleton">
            <div className="overlay__skeleton-actions">
              <div className="skeleton-box" style={{ width: 90, height: 34 }} />
              <div className="skeleton-box" style={{ width: 100, height: 34 }} />
              <div className="skeleton-box" style={{ width: 110, height: 34 }} />
            </div>
            <div className="overlay__skeleton-divider" />
            <div className="overlay__skeleton-items">
              {[1, 2, 3].map((i) => (
                <div key={i} className="overlay__skeleton-row">
                  <div className="skeleton-box" style={{ width: "60%", height: 16 }} />
                  <div className="skeleton-box" style={{ width: 50, height: 16 }} />
                </div>
              ))}
            </div>
            <div className="overlay__skeleton-divider" />
            <div className="overlay__skeleton-footer">
              {[1, 2, 3].map((i) => (
                <div key={i} className="overlay__skeleton-row">
                  <div className="skeleton-box" style={{ width: 80, height: 16 }} />
                  <div className="skeleton-box" style={{ width: 60, height: 16 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeOverlayTab === "order" && !loading && (
          <>
            {detail ? (
              <>
                <div className="overlay__actions">
                  <button type="button" className="overlay__action-btn">
                    ADD ITEM
                  </button>
                  <button type="button" className="overlay__action-btn">
                    MOVE TABLE
                  </button>
                  <button
                    type="button"
                    className="overlay__action-btn"
                    onClick={() => setShowCloseCheck(true)}
                  >
                    CLOSE CHECK
                  </button>
                </div>

                <div className="overlay__divider" />

                <div className="overlay__body">
                  {detail.items.length === 0 ? (
                    <p className="overlay__empty">No dishes ordered yet.</p>
                  ) : (
                    guestSlots.map((slot) => {
                      const slotItems = detail.items.filter((i) => i.guest_slot === slot)
                      return (
                        <div key={slot} className="overlay__slot">
                          <h3 className="overlay__slot-title">GUEST {slot}</h3>
                          {slotItems.map((item) => (
                            <OrderItemRow key={item.public_id} item={item} />
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>

                {detail.items.length > 0 && <div className="overlay__divider" />}

                {detail.items.length > 0 && (
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
                      <span className="overlay__total-label overlay__total-label--large">
                        TOTAL
                      </span>
                      <span className="overlay__total-value overlay__total-value--large">
                        &euro;{detail.total_amount}
                      </span>
                    </div>
                    <button type="button" className="overlay__cta">
                      PROCESS PAYMENT
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="overlay__empty">No active order for this table.</p>
            )}
          </>
        )}

        {activeOverlayTab === "reservations" && (
          <div className="overlay__body">
            {upcomingReservations.length === 0 ? (
              <p className="overlay__empty">No upcoming reservations for this table.</p>
            ) : (
              upcomingReservations.map((r) => (
                <div key={r.public_id} className="overlay__reservation-row">
                  <div className="overlay__reservation-info">
                    <span className="overlay__reservation-name">{r.name}</span>
                    <span className="overlay__reservation-meta">
                      {r.guest_count} guests &middot; {formatTimeRange(r.start_at, r.end_at)}
                    </span>
                  </div>
                  {!isOccupied && r.status === "pending" && (
                    <button
                      type="button"
                      className="overlay__seat-btn"
                      disabled={actionBusy}
                      onClick={() => onActivateReservation?.(r.public_id)}
                    >
                      {actionBusy ? "…" : "SEAT"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showCloseCheck && (
        <CloseCheckModal
          busy={actionBusy}
          error={actionError}
          onConfirm={() => onCloseCheck?.()}
          onClose={() => setShowCloseCheck(false)}
        />
      )}
    </>
  )
}
