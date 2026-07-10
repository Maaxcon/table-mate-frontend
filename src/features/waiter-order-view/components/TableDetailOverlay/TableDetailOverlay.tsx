import { useState } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { formatTimeRange } from "../../types"
import type { FloorTable, ReservationItem, OverlayDetail, VisualTableStatus } from "../../types"
import { getCurrencySymbol } from "@/features/menu/utils"
import { OrderItemRow } from "../OrderItemRow"
import { CloseCheckModal } from "../CloseCheckModal"
import "./TableDetailOverlay.css"

function getOverdueMinutes(endAt: string, nowMs: number): number | null {
  const endMs = new Date(endAt).getTime()
  if (!Number.isFinite(endMs)) return null
  const overdueMs = nowMs - endMs
  if (overdueMs <= 0) return null
  return Math.max(1, Math.floor(overdueMs / 60_000))
}

interface TableDetailOverlayProps {
  table: FloorTable
  detail: OverlayDetail | null
  tableReservations: ReservationItem[]
  visualStatus: VisualTableStatus
  loading: boolean
  currentTime: Date
  actionBusy?: boolean
  busyActionId?: string | null
  actionError?: string | null
  onOpenTable?: (guestCount: number) => void
  onActivateReservation?: (reservationId: string) => void
  onCancelReservation?: (reservationId: string) => void
  onCloseCheck?: () => void
  onAddItem?: () => void
  onModifyReservation?: (reservation: ReservationItem) => void
  onMoveTable?: (reservation: ReservationItem) => void
  onCreateReservation?: () => void
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
  busyActionId = null,
  actionError = null,
  onOpenTable,
  onActivateReservation,
  onCancelReservation,
  onCloseCheck,
  onAddItem,
  onModifyReservation,
  onMoveTable,
  onCreateReservation,
  onClose,
}: TableDetailOverlayProps) {
  const isOccupied = visualStatus === "occupied"
  const isReserved = visualStatus === "reserved"
  const [activeOverlayTab, setActiveOverlayTab] = useState<"order" | "reservations">(
    isOccupied ? "order" : "reservations",
  )
  const [guestCount, setGuestCount] = useState(2)
  const [showCloseCheck, setShowCloseCheck] = useState(false)
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })

  // Use the bill's real currency rather than a hardcoded symbol.
  const currencySymbol = detail ? getCurrencySymbol(detail.currency) : ""

  const guestSlots = detail
    ? [...new Set(detail.items.map((i) => i.guest_slot))].sort((a, b) => a - b)
    : []
  const byStart = (a: ReservationItem, b: ReservationItem) =>
    new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  const nearestReservation =
    tableReservations.length > 0 ? [...tableReservations].sort(byStart)[0] : null
  const pendingReservation =
    [...tableReservations].filter((r) => r.status === "pending").sort(byStart)[0] ?? null
  // The soonest booking that has not started yet — shown as the table's "next".
  const nextReservation =
    [...tableReservations]
      .filter((r) => new Date(r.start_at).getTime() > currentTime.getTime())
      .sort(byStart)[0] ?? null
  // All of the table's bookings for the day (active + upcoming), earliest first.
  const dayReservations = [...tableReservations].sort(byStart)
  const overdueActiveReservation = dayReservations.find((reservation) => {
    if (reservation.status !== "active") return false
    return getOverdueMinutes(reservation.end_at, currentTime.getTime()) != null
  })
  const overdueMinutes = overdueActiveReservation
    ? getOverdueMinutes(overdueActiveReservation.end_at, currentTime.getTime())
    : null
  const hasOrderItems = Boolean(detail && detail.items.length > 0)
  const primaryAction =
    !loading && isOccupied
      ? hasOrderItems && onCloseCheck
        ? {
            type: "close-check" as const,
            label: actionBusy ? "CLOSING…" : "CLOSE CHECK",
            onClick: () => setShowCloseCheck(true),
            disabled: actionBusy,
          }
        : onAddItem
          ? {
              type: "add-items" as const,
              label: "ADD ITEMS",
              onClick: () => onAddItem(),
              disabled: actionBusy,
            }
          : onCloseCheck
            ? {
                type: "close-check" as const,
                label: actionBusy ? "CLOSING…" : "CLOSE CHECK",
                onClick: () => setShowCloseCheck(true),
                disabled: actionBusy,
              }
            : null
      : !loading && pendingReservation && onActivateReservation
        ? {
            type: "seat" as const,
            label: busyActionId === pendingReservation.public_id ? "SEATING…" : "SEAT GUEST",
            onClick: () => onActivateReservation(pendingReservation.public_id),
            disabled: actionBusy,
          }
        : !loading && onOpenTable
          ? {
              type: "open" as const,
              label: actionBusy ? "OPENING…" : "OPEN TABLE",
              onClick: () => onOpenTable(guestCount),
              disabled: actionBusy,
            }
          : null

  const showAddItemSecondary = Boolean(onAddItem && primaryAction?.type !== "add-items")
  const showMoveTableSecondary = Boolean(nearestReservation && onMoveTable)
  const showCloseCheckSecondary = Boolean(onCloseCheck && primaryAction?.type !== "close-check")
  const showOrderSecondaryActions =
    showAddItemSecondary || showMoveTableSecondary || showCloseCheckSecondary

  return (
    <>
      <div className="overlay-backdrop" role="presentation" onClick={onClose} />
      <div
        className="overlay"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-detail-title"
      >
        <div className="overlay__header">
          <div className="overlay__header-top">
            <h2 id="table-detail-title" className="overlay__title">
              TABLE {table.public_number}
            </h2>
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
          <div className="overlay__status-cards">
            <div className="overlay__status-card">
              <p className="overlay__status-label">
                {isReserved ? "Reserved" : isOccupied ? "Current Party" : "Capacity"}
              </p>
              <p className="overlay__status-value">
                {loading
                  ? ""
                  : isReserved
                    ? nearestReservation
                      ? `${nearestReservation.name}`
                      : "Upcoming"
                    : isOccupied && detail
                      ? detail.guest_name
                      : `${table.capacity} guests`}
              </p>
            </div>
            <div className="overlay__status-card">
              <p className="overlay__status-label">Details</p>
              <p className="overlay__status-value">
                {loading
                  ? ""
                  : isOccupied && detail
                    ? `${detail.guest_count} guests • ${detail.duration}`
                    : nextReservation
                      ? `${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}`
                      : "Available"}
              </p>
            </div>
            {(nextReservation || (isOccupied && detail)) && (
              <div className="overlay__status-card overlay__status-card--muted">
                <p className="overlay__status-label">{isOccupied ? "Next Booking" : "Next"}</p>
                <p className="overlay__status-value">
                  {isOccupied && detail
                    ? nextReservation
                      ? `${nextReservation.name} • ${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}`
                      : detail.duration
                    : nextReservation
                      ? `${nextReservation.name} • ${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}`
                      : "None"}
                </p>
              </div>
            )}
          </div>
        </div>

        {isOccupied && overdueActiveReservation && overdueMinutes != null && (
          <div className="overlay__overdue-banner" role="alert">
            <div className="overlay__overdue-copy">
              <p className="overlay__overdue-title">
                Reservation time ended {overdueMinutes} min ago
              </p>
              <p className="overlay__overdue-text">Close this table or prolong the booking.</p>
            </div>
            <div className="overlay__overdue-actions">
              {onModifyReservation && (
                <button
                  type="button"
                  className="overlay__overdue-btn overlay__overdue-btn--ghost"
                  onClick={() => onModifyReservation(overdueActiveReservation)}
                  disabled={actionBusy}
                >
                  PROLONG
                </button>
              )}
              {onCloseCheck && (
                <button
                  type="button"
                  className="overlay__overdue-btn"
                  onClick={() => setShowCloseCheck(true)}
                  disabled={actionBusy}
                >
                  CLOSE CHECK
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && primaryAction && primaryAction.type !== "open" && (
          <div className="overlay__primary-action">
            <p className="overlay__primary-action-label">Primary action</p>
            {primaryAction.type === "seat" && pendingReservation && (
              <p className="overlay__primary-action-meta">
                {pendingReservation.name} &middot;{" "}
                {formatTimeRange(pendingReservation.start_at, pendingReservation.end_at)}
              </p>
            )}
            <button
              type="button"
              className="overlay__cta overlay__cta--primary-action"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </button>
          </div>
        )}

        {!isOccupied && !loading && (
          <div className="overlay__open-panel">
            {actionError && (
              <p className="overlay__action-error" role="alert">
                {actionError}
              </p>
            )}
            {primaryAction?.type === "seat" ? (
              <p className="overlay__open-hint">
                This table has a pending reservation. Use the primary action above to seat.
              </p>
            ) : primaryAction?.type === "open" ? (
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
                  disabled={primaryAction.disabled}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                </button>
              </div>
            ) : (
              <p className="overlay__open-hint">No available table action right now.</p>
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
                {showOrderSecondaryActions && (
                  <>
                    <div className="overlay__actions overlay__actions--pill">
                      {showAddItemSecondary && (
                        <button type="button" className="overlay__action-btn" onClick={onAddItem}>
                          ADD ITEM
                        </button>
                      )}
                      {showMoveTableSecondary && nearestReservation && onMoveTable && (
                        <button
                          type="button"
                          className="overlay__action-btn"
                          onClick={() => onMoveTable(nearestReservation)}
                        >
                          MOVE TABLE
                        </button>
                      )}
                      {showCloseCheckSecondary && (
                        <button
                          type="button"
                          className="overlay__action-btn"
                          onClick={() => setShowCloseCheck(true)}
                        >
                          CLOSE CHECK
                        </button>
                      )}
                    </div>

                    <div className="overlay__divider" />
                  </>
                )}

                <div className="overlay__body">
                  {detail.items.length === 0 ? (
                    <p className="overlay__empty">No dishes ordered yet.</p>
                  ) : (
                    guestSlots.map((slot) => {
                      const slotItems = detail.items.filter((i) => i.guest_slot === slot)
                      const guestName = slotItems[0]?.guest_display_name
                      return (
                        <div key={slot} className="overlay__slot">
                          <h3 className="overlay__slot-title">{guestName ?? `GUEST ${slot}`}</h3>
                          {slotItems.map((item) => (
                            <OrderItemRow
                              key={item.public_id}
                              item={item}
                              currencySymbol={currencySymbol}
                            />
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
                      <span className="overlay__total-value">
                        {currencySymbol}
                        {detail.subtotal}
                      </span>
                    </div>
                    <div className="overlay__total-row">
                      <span className="overlay__total-label">TAX</span>
                      <span className="overlay__total-value">
                        {currencySymbol}
                        {detail.tax_total}
                      </span>
                    </div>
                    {detail.service_charge != null && Number(detail.service_charge) > 0 && (
                      <div className="overlay__total-row">
                        <span className="overlay__total-label">SERVICE</span>
                        <span className="overlay__total-value">
                          {currencySymbol}
                          {detail.service_charge}
                        </span>
                      </div>
                    )}
                    <div className="overlay__total-row overlay__total-row--final">
                      <span className="overlay__total-label overlay__total-label--large">
                        TOTAL
                      </span>
                      <span className="overlay__total-value overlay__total-value--large">
                        {currencySymbol}
                        {detail.total_amount}
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
          <div className="overlay__body overlay__body--reservations">
            {dayReservations.length === 0 ? (
              <p className="overlay__empty">No reservations for this table.</p>
            ) : (
              <div className="overlay__reservation-list">
                {dayReservations.map((r) => (
                  <div
                    key={r.public_id}
                    className={`overlay__reservation-row overlay__reservation-row--${r.status}`}
                  >
                    <div className="overlay__reservation-info">
                      <span className="overlay__reservation-name">
                        {r.name}
                        {r.status === "active" && (
                          <span className="overlay__reservation-tag">SEATED NOW</span>
                        )}
                      </span>
                      <span className="overlay__reservation-meta">
                        {r.guest_count} guests &middot; {formatTimeRange(r.start_at, r.end_at)}
                      </span>
                    </div>
                    <div className="overlay__reservation-actions">
                      {!isOccupied && r.status === "pending" && (
                        <>
                          <button
                            type="button"
                            className="overlay__seat-btn"
                            disabled={actionBusy}
                            onClick={() => onActivateReservation?.(r.public_id)}
                          >
                            {busyActionId === r.public_id ? "…" : "SEAT"}
                          </button>
                          {onModifyReservation && (
                            <button
                              type="button"
                              className="overlay__seat-btn overlay__seat-btn--modify"
                              disabled={actionBusy}
                              onClick={() => onModifyReservation(r)}
                            >
                              MODIFY
                            </button>
                          )}
                          {onCancelReservation && (
                            <button
                              type="button"
                              className="overlay__seat-btn overlay__seat-btn--cancel"
                              disabled={actionBusy}
                              onClick={() => onCancelReservation(r.public_id)}
                            >
                              CANCEL
                            </button>
                          )}
                        </>
                      )}
                      {r.status === "active" && onModifyReservation && (
                        <button
                          type="button"
                          className="overlay__seat-btn overlay__seat-btn--modify"
                          onClick={() => onModifyReservation(r)}
                        >
                          MODIFY
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {onCreateReservation && (
              <div className="overlay__body-footer overlay__body-footer--sticky">
                <button type="button" className="overlay__cta" onClick={onCreateReservation}>
                  NEW RESERVATION
                </button>
              </div>
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
