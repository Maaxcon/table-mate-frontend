import { useEffect, useState } from "react"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { formatTimeRange } from "../../types"
import type { FloorTable, ReservationItem, OverlayDetail, VisualTableStatus } from "../../types"
import { getCurrencySymbol } from "@/features/menu/utils"
import { OrderItemRow } from "../OrderItemRow"
import { CloseCheckModal } from "../CloseCheckModal"
import { ProcessPaymentModal } from "../ProcessPaymentModal"
import { fetchVoidReasons } from "../../api/orderApi"
import type { VoidReason } from "@/types/api/types.gen"
import "./TableDetailOverlay.css"
import { useWaiterStrings } from "../../strings"

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
  onProcessPayment?: (orderItemIds: string[]) => void
  onAddItem?: () => void
  onModifyReservation?: (reservation: ReservationItem) => void
  onMoveTable?: (reservation: ReservationItem) => void
  onCreateReservation?: () => void
  onMarkItemServed?: (itemId: string) => void
  onMarkAllServed?: () => void
  onMarkAllVoided?: (reasonCode: string) => void
  onVoidItem?: (itemId: string, reasonCode: string) => void
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
  onProcessPayment,
  onAddItem,
  onModifyReservation,
  onMoveTable,
  onCreateReservation,
  onMarkItemServed,
  onMarkAllServed,
  onMarkAllVoided,
  onVoidItem,
  onClose,
}: TableDetailOverlayProps) {
  const waiterStrings = useWaiterStrings()
  const overlayStrings = waiterStrings.overlay
  const isOccupied = visualStatus === "occupied"
  const isReserved = visualStatus === "reserved"
  const [activeOverlayTab, setActiveOverlayTab] = useState<"order" | "reservations">(
    isOccupied ? "order" : "reservations",
  )
  const [guestCount, setGuestCount] = useState(2)
  const [showCloseCheck, setShowCloseCheck] = useState(false)
  const [showProcessPayment, setShowProcessPayment] = useState(false)
  const [voidReasons, setVoidReasons] = useState<VoidReason[]>([])
  const [showBulkVoidForm, setShowBulkVoidForm] = useState(false)
  const [bulkVoidReason, setBulkVoidReason] = useState("")
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })

  useEffect(() => {
    if (!onVoidItem && !onMarkAllVoided) return
    const controller = new AbortController()
    fetchVoidReasons(controller.signal)
      .then(setVoidReasons)
      .catch(() => setVoidReasons([]))
    return () => controller.abort()
  }, [onVoidItem])

  // Use the bill's real currency rather than a hardcoded symbol.
  const currencySymbol = detail ? getCurrencySymbol(detail.currency) : ""

  // What the "Process payment" picker offers: ordered, unpaid, non-voided lines.
  const payableItems = detail ? detail.items.filter((i) => !i.is_paid && i.status !== "voided") : []
  const outstandingTotal = payableItems.reduce(
    (sum, i) => sum + (Number.parseFloat(i.payable) || 0),
    0,
  )

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
  // All of the table's bookings for the day (active + upcoming), earliest first.
  const dayReservations = [...tableReservations].sort(byStart)
  const overdueActiveReservation = dayReservations.find((reservation) => {
    if (reservation.status !== "active") return false
    return (
      getOverdueMinutes(reservation.session_ends_at ?? reservation.end_at, currentTime.getTime()) !=
      null
    )
  })
  const overdueMinutes = overdueActiveReservation
    ? getOverdueMinutes(
        overdueActiveReservation.session_ends_at ?? overdueActiveReservation.end_at,
        currentTime.getTime(),
      )
    : null

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
              {overlayStrings.title(table.public_number)}
            </h2>
            <button
              type="button"
              className="overlay__close"
              onClick={onClose}
              aria-label={overlayStrings.closeAria}
            >
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
                {isReserved
                  ? overlayStrings.status.reserved
                  : isOccupied
                    ? overlayStrings.status.current
                    : overlayStrings.status.capacity}
              </p>
              <p className="overlay__status-value">
                {loading
                  ? ""
                  : isReserved
                    ? nearestReservation
                      ? `${nearestReservation.name}`
                      : overlayStrings.values.upcoming
                    : isOccupied && detail
                      ? detail.guest_name
                      : table.capacity != null
                        ? overlayStrings.values.guests(table.capacity)
                        : overlayStrings.values.available}
              </p>
            </div>
            <div className="overlay__status-card">
              <p className="overlay__status-label">{overlayStrings.status.details}</p>
              <p className="overlay__status-value">
                {loading
                  ? ""
                  : isOccupied && detail
                    ? `${overlayStrings.values.guests(detail.guest_count)} • ${detail.duration}`
                    : nextReservation
                      ? `${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}`
                      : overlayStrings.values.available}
              </p>
            </div>
            {(nextReservation || (isOccupied && detail)) && (
              <div className="overlay__status-card overlay__status-card--muted">
                <p className="overlay__status-label">
                  {isOccupied ? overlayStrings.status.nextBooking : overlayStrings.status.next}
                </p>
                <p className="overlay__status-value">
                  {isOccupied && detail
                    ? nextReservation
                      ? `${nextReservation.name} • ${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}`
                      : detail.duration
                    : nextReservation
                      ? `${nextReservation.name} • ${formatTimeRange(nextReservation.start_at, nextReservation.end_at)}`
                      : overlayStrings.values.none}
                </p>
              </div>
            )}
          </div>
        </div>

        {isOccupied && overdueActiveReservation && overdueMinutes != null && (
          <div className="overlay__overdue-banner" role="alert">
            <div className="overlay__overdue-copy">
              <p className="overlay__overdue-title">
                {overlayStrings.overdue.title(overdueMinutes)}
              </p>
              <p className="overlay__overdue-text">{overlayStrings.overdue.message}</p>
            </div>
            <div className="overlay__overdue-actions">
              {onModifyReservation && (
                <button
                  type="button"
                  className="overlay__overdue-btn overlay__overdue-btn--ghost"
                  onClick={() => onModifyReservation(overdueActiveReservation)}
                  disabled={actionBusy}
                >
                  {overlayStrings.overdue.prolong}
                </button>
              )}
              {onCloseCheck && (
                <button
                  type="button"
                  className="overlay__overdue-btn"
                  onClick={() => setShowCloseCheck(true)}
                  disabled={actionBusy}
                >
                  {overlayStrings.overdue.close}
                </button>
              )}
            </div>
          </div>
        )}

        {!isOccupied && !loading && (
          <div className="overlay__open-panel">
            {actionError && (
              <p className="overlay__action-error" role="alert">
                {actionError}
              </p>
            )}
            {tableReservations.some((r) => r.status === "pending") ? (
              <p className="overlay__open-hint">{overlayStrings.openPanel.seatHint}</p>
            ) : (
              <div className="overlay__open-row">
                <label className="overlay__guests">
                  {overlayStrings.openPanel.guestLabel}
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
                  {actionBusy ? overlayStrings.openPanel.busy : overlayStrings.openPanel.action}
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
              {overlayStrings.tabs.order}
            </button>
          )}
          <button
            type="button"
            className={`overlay__tab ${activeOverlayTab === "reservations" ? "overlay__tab--active" : ""}`}
            onClick={() => setActiveOverlayTab("reservations")}
          >
            {overlayStrings.tabs.reservations}
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
                <div className="overlay__actions overlay__actions--pill">
                  <button type="button" className="overlay__action-btn" onClick={onAddItem}>
                    {overlayStrings.actions.addItem}
                  </button>
                  {nearestReservation && onMoveTable && (
                    <button
                      type="button"
                      className="overlay__action-btn"
                      onClick={() => onMoveTable(nearestReservation)}
                    >
                      {overlayStrings.actions.moveTable}
                    </button>
                  )}
                  <button
                    type="button"
                    className="overlay__action-btn"
                    onClick={() => setShowCloseCheck(true)}
                  >
                    {overlayStrings.actions.closeCheck}
                  </button>
                </div>

                <div className="overlay__divider" />

                <div className="overlay__body">
                  {actionError && (
                    <p className="overlay__action-error" role="alert">
                      {actionError}
                    </p>
                  )}
                  {(() => {
                    const readyItems = detail.items.filter((i) => i.status === "ready")
                    const voidableItems = detail.items.filter(
                      (i) => i.status !== "voided" && i.status !== "served" && !i.is_paid,
                    )
                    const hasAnyAction =
                      (readyItems.length > 0 && onMarkAllServed) ||
                      (voidableItems.length > 0 && onMarkAllVoided && voidReasons.length > 0)
                    if (!hasAnyAction) return null
                    return (
                      <div className="overlay__mark-all-row">
                        {readyItems.length > 0 && onMarkAllServed && (
                          <button
                            type="button"
                            className="overlay__mark-all-btn overlay__mark-all-btn--serve"
                            onClick={onMarkAllServed}
                          >
                            {overlayStrings.actions.markAllServed} ({readyItems.length})
                          </button>
                        )}
                        {voidableItems.length > 0 && onMarkAllVoided && voidReasons.length > 0 && (
                          <div className="overlay__mark-all-void-wrap">
                            {showBulkVoidForm ? (
                              <div className="overlay__bulk-void-form">
                                <label className="overlay__bulk-void-label">
                                  {overlayStrings.actions.bulkVoidReason}
                                  <select
                                    className="overlay__bulk-void-select"
                                    value={bulkVoidReason}
                                    onChange={(event) => setBulkVoidReason(event.target.value)}
                                  >
                                    <option value="" disabled>
                                      {overlayStrings.actions.selectVoidReason}
                                    </option>
                                    {voidReasons.map((reason) => (
                                      <option key={reason.code} value={reason.code}>
                                        {overlayStrings.voidReasons[
                                          reason.code as keyof typeof overlayStrings.voidReasons
                                        ] ?? reason.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="overlay__bulk-void-actions">
                                  <button
                                    type="button"
                                    className="overlay__mark-all-btn overlay__mark-all-btn--void"
                                    disabled={!bulkVoidReason}
                                    onClick={() => {
                                      onMarkAllVoided(bulkVoidReason)
                                      setShowBulkVoidForm(false)
                                      setBulkVoidReason("")
                                    }}
                                  >
                                    {overlayStrings.actions.confirmBulkVoid} ({voidableItems.length}
                                    )
                                  </button>
                                  <button
                                    type="button"
                                    className="overlay__bulk-void-cancel"
                                    onClick={() => {
                                      setShowBulkVoidForm(false)
                                      setBulkVoidReason("")
                                    }}
                                  >
                                    {overlayStrings.actions.cancel}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="overlay__mark-all-btn overlay__mark-all-btn--void"
                                onClick={() => setShowBulkVoidForm(true)}
                              >
                                {overlayStrings.actions.markAllVoided} ({voidableItems.length})
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {detail.items.length === 0 ? (
                    <p className="overlay__empty">{overlayStrings.empty.order}</p>
                  ) : (
                    guestSlots.map((slot) => {
                      const slotItems = detail.items.filter((i) => i.guest_slot === slot)
                      const guestName = slotItems[0]?.guest_display_name
                      return (
                        <div key={slot} className="overlay__slot">
                          <h3 className="overlay__slot-title">
                            {guestName ?? overlayStrings.guestSlot(slot)}
                          </h3>
                          {slotItems.map((item) => (
                            <OrderItemRow
                              key={item.public_id}
                              item={item}
                              currencySymbol={currencySymbol}
                              voidReasons={voidReasons}
                              onMarkServed={onMarkItemServed}
                              onVoid={onVoidItem}
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
                      <span className="overlay__total-label">{overlayStrings.totals.subtotal}</span>
                      <span className="overlay__total-value">
                        {currencySymbol}
                        {detail.subtotal}
                      </span>
                    </div>
                    <div className="overlay__total-row">
                      <span className="overlay__total-label">{overlayStrings.totals.tax}</span>
                      <span className="overlay__total-value">
                        {currencySymbol}
                        {detail.tax_total}
                      </span>
                    </div>
                    {detail.service_charge != null && Number(detail.service_charge) > 0 && (
                      <div className="overlay__total-row">
                        <span className="overlay__total-label">
                          {overlayStrings.totals.service}
                        </span>
                        <span className="overlay__total-value">
                          {currencySymbol}
                          {detail.service_charge}
                        </span>
                      </div>
                    )}
                    <div className="overlay__total-row overlay__total-row--final">
                      <span className="overlay__total-label overlay__total-label--large">
                        {overlayStrings.totals.total}
                      </span>
                      <span className="overlay__total-value overlay__total-value--large">
                        {currencySymbol}
                        {detail.total_amount}
                      </span>
                    </div>
                    {payableItems.length > 0 && (
                      <div className="overlay__total-row">
                        <span className="overlay__total-label">
                          {overlayStrings.totals.outstanding}
                        </span>
                        <span className="overlay__total-value">
                          {currencySymbol}
                          {outstandingTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="overlay__cta"
                      onClick={() => setShowProcessPayment(true)}
                      disabled={!onProcessPayment || payableItems.length === 0}
                    >
                      {overlayStrings.actions.processPayment}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="overlay__empty">{overlayStrings.empty.orderMissing}</p>
            )}
          </>
        )}

        {activeOverlayTab === "reservations" && (
          <div className="overlay__body overlay__body--reservations">
            {dayReservations.length === 0 ? (
              <p className="overlay__empty">{overlayStrings.empty.reservations}</p>
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
                          <span className="overlay__reservation-tag">
                            {overlayStrings.reservation.tagSeated}
                          </span>
                        )}
                      </span>
                      <span className="overlay__reservation-meta">
                        {overlayStrings.values.guests(r.guest_count)} &middot;{" "}
                        {formatTimeRange(r.start_at, r.end_at)}
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
                            {busyActionId === r.public_id ? "…" : overlayStrings.reservation.seat}
                          </button>
                          {onModifyReservation && (
                            <button
                              type="button"
                              className="overlay__seat-btn overlay__seat-btn--modify"
                              disabled={actionBusy}
                              onClick={() => onModifyReservation(r)}
                            >
                              {overlayStrings.reservation.modify}
                            </button>
                          )}
                          {onCancelReservation && (
                            <button
                              type="button"
                              className="overlay__seat-btn overlay__seat-btn--cancel"
                              disabled={actionBusy}
                              onClick={() => onCancelReservation(r.public_id)}
                            >
                              {overlayStrings.reservation.cancel}
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
                          {overlayStrings.reservation.modify}
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
                  {overlayStrings.reservation.new}
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

      {showProcessPayment && (
        <ProcessPaymentModal
          items={payableItems}
          currencySymbol={currencySymbol}
          busy={actionBusy}
          error={actionError}
          onConfirm={(orderItemIds) => onProcessPayment?.(orderItemIds)}
          onClose={() => setShowProcessPayment(false)}
        />
      )}
    </>
  )
}
