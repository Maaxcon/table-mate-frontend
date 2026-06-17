import { useState, useEffect } from "react"
import { getTimeFromDatetime } from "../data/waiterTypes"
import type {
  FloorTable,
  ReservationItem,
  OverlayDetail,
  VisualTableStatus,
  UpcomingReservation,
} from "../data/waiterTypes"
import { closeCheck, moveTable, cancelReservation } from "@/features/reservation/api"
import { OrderItemRow } from "./OrderItemRow"
import "./TableDetailOverlay.css"

interface TableDetailOverlayProps {
  table: FloorTable
  detail: OverlayDetail | null
  tableReservations: ReservationItem[]
  visualStatus: VisualTableStatus
  loading: boolean
  allTables: FloorTable[]
  allReservations: ReservationItem[]
  upcomingReservations: UpcomingReservation[]
  onClose: () => void
  onRefresh: () => void
  onBookTable?: (table: FloorTable) => void
  onModifyReservation?: (reservation: ReservationItem) => void
}

export function TableDetailOverlay({
  table,
  detail,
  tableReservations,
  visualStatus,
  loading,
  allTables,
  allReservations,
  upcomingReservations,
  onClose,
  onRefresh,
  onBookTable,
  onModifyReservation,
}: TableDetailOverlayProps) {
  const isOccupied = visualStatus === "occupied"
  const isReserved = visualStatus === "reserved"
  const [activeOverlayTab, setActiveOverlayTab] = useState<"order" | "reservations">(
    isOccupied ? "order" : "reservations",
  )
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const [confirmMove, setConfirmMove] = useState<{
    tableId: string
    tableNumber: string
    capacity: number
  } | null>(null)

  const guestSlots = detail
    ? [...new Set(detail.items.map((i) => i.guest_slot))].sort((a, b) => a - b)
    : []
  const sortedReservations = [...tableReservations].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  )
  const activeReservation =
    tableReservations.find((r) => r.status === "active") ?? sortedReservations[0] ?? null

  const activeReservationId = activeReservation?.public_id
  const currentGuestCount = detail?.guest_count ?? 0

  const reservedTableNumbers = new Set(
    allReservations
      .filter((r) => r.status === "pending" || r.status === "active")
      .map((r) => r.table),
  )

  const availableTablesWithInfo = allTables
    .filter(
      (t) =>
        t.public_id !== table.public_id &&
        !t.is_occupied &&
        !reservedTableNumbers.has(t.table_number),
    )
    .map((t) => {
      const now = new Date()
      const nextReservation = upcomingReservations
        .filter((r) => r.table_id === t.public_id && new Date(r.start_at) > now)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0]
      return {
        ...t,
        nextReservationStartAt: nextReservation?.start_at ?? null,
        hasCapacityIssue: t.capacity < currentGuestCount,
      }
    })

  const handleCloseCheck = async () => {
    if (!activeReservationId) return
    setActionLoading(true)
    setError(null)
    try {
      await closeCheck(activeReservationId)
      onRefresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close check")
    } finally {
      setActionLoading(false)
    }
  }

  const handleMoveTableClick = (newTableId: string, tableNumber: string, capacity: number) => {
    const tableInfo = availableTablesWithInfo.find((t) => t.public_id === newTableId)
    if (tableInfo?.hasCapacityIssue) {
      setConfirmMove({ tableId: newTableId, tableNumber, capacity })
    } else {
      handleMoveTable(newTableId)
    }
  }

  const handleMoveTable = async (newTableId: string) => {
    if (!activeReservationId) return
    setActionLoading(true)
    setError(null)
    try {
      await moveTable(activeReservationId, newTableId)
      setShowMoveModal(false)
      setConfirmMove(null)
      onRefresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move table")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelReservation = async (reservationId: string) => {
    setActionLoading(true)
    setError(null)
    try {
      await cancelReservation(reservationId)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel reservation")
    } finally {
      setActionLoading(false)
    }
  }

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
                ? `Reserved ${activeReservation ? `• ${activeReservation.name} at ${getTimeFromDatetime(activeReservation.start_at)}` : ""}`
                : isOccupied && detail
                  ? `Current Party: ${detail.guest_name} • ${detail.guest_count} Guests • Duration: ${detail.duration}`
                  : activeReservation
                    ? `Capacity: ${table.capacity} • Next: ${activeReservation.name} at ${getTimeFromDatetime(activeReservation.start_at)}`
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
                  <button
                    type="button"
                    className="overlay__action-btn"
                    onClick={() => setShowMoveModal(true)}
                    disabled={actionLoading || availableTablesWithInfo.length === 0}
                  >
                    MOVE TABLE
                  </button>
                  <button
                    type="button"
                    className="overlay__action-btn"
                    onClick={handleCloseCheck}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "CLOSING..." : "CLOSE CHECK"}
                  </button>
                </div>

                {error && <p className="overlay__error">{error}</p>}

                {detail.items.length > 0 && (
                  <>
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
                  </>
                )}

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
            ) : (
              <p className="overlay__empty">No session for this table.</p>
            )}
          </>
        )}

        {activeOverlayTab === "reservations" && (
          <div className="overlay__body">
            {onBookTable && (
              <button
                type="button"
                className="overlay__action-btn overlay__book-btn"
                onClick={() => onBookTable(table)}
              >
                BOOK THIS TABLE
              </button>
            )}
            {tableReservations.length === 0 ? (
              <div className="overlay__reservations-empty">
                <p className="overlay__empty">No reservations for this table.</p>
              </div>
            ) : (
              tableReservations.map((r) => {
                const isLate =
                  r.status === "pending" && new Date(r.start_at).getTime() < currentTime.getTime()
                return (
                  <div
                    key={r.public_id}
                    className={`overlay__reservation-row ${isLate ? "overlay__reservation-row--late" : ""}`}
                  >
                    <div className="overlay__reservation-info">
                      <span className="overlay__reservation-name">
                        {r.name}
                        {isLate && <span className="overlay__late-badge">LATE</span>}
                      </span>
                      <span className="overlay__reservation-meta">
                        {r.guest_count} guests &middot; {getTimeFromDatetime(r.start_at)}
                        {r.end_at && ` — ${getTimeFromDatetime(r.end_at)}`}
                      </span>
                      {r.notes && <span className="overlay__reservation-notes">{r.notes}</span>}
                      <span className="overlay__reservation-status">{r.status}</span>
                    </div>
                    <div className="overlay__reservation-actions">
                      {onModifyReservation && (
                        <button
                          type="button"
                          className="overlay__modify-btn"
                          onClick={() => onModifyReservation(r)}
                          disabled={actionLoading}
                        >
                          MODIFY
                        </button>
                      )}
                      {r.status === "pending" && (
                        <button
                          type="button"
                          className="overlay__cancel-btn"
                          onClick={() => handleCancelReservation(r.public_id)}
                          disabled={actionLoading}
                        >
                          CANCEL
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {showMoveModal && (
          <div className="overlay__move-modal">
            <div className="overlay__move-modal-content">
              <h3 className="overlay__move-modal-title">MOVE TO TABLE</h3>
              <div className="overlay__move-modal-tables">
                {availableTablesWithInfo.length === 0 ? (
                  <p className="overlay__empty">No available tables</p>
                ) : (
                  availableTablesWithInfo.map((t) => (
                    <button
                      key={t.public_id}
                      type="button"
                      className={`overlay__move-table-btn ${t.hasCapacityIssue ? "overlay__move-table-btn--warning" : ""}`}
                      onClick={() => handleMoveTableClick(t.public_id, t.table_number, t.capacity)}
                      disabled={actionLoading}
                    >
                      <div className="overlay__move-table-info">
                        <span className="overlay__move-table-number">Table {t.table_number}</span>
                        <span className="overlay__move-table-capacity">
                          {t.capacity} P {t.hasCapacityIssue && `(party: ${currentGuestCount})`}
                        </span>
                      </div>
                      {t.nextReservationStartAt && (
                        <span className="overlay__move-table-next">
                          Next: {getTimeFromDatetime(t.nextReservationStartAt)}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                className="overlay__move-modal-close"
                onClick={() => setShowMoveModal(false)}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {confirmMove && (
          <div className="overlay__confirm-modal">
            <div className="overlay__confirm-content">
              <h3 className="overlay__confirm-title">CAPACITY WARNING</h3>
              <p className="overlay__confirm-text">
                Table {confirmMove.tableNumber} has {confirmMove.capacity} seats, but the party has{" "}
                {currentGuestCount} guests.
              </p>
              <p className="overlay__confirm-text">Are you sure you want to move?</p>
              <div className="overlay__confirm-actions">
                <button
                  type="button"
                  className="overlay__confirm-btn overlay__confirm-btn--cancel"
                  onClick={() => setConfirmMove(null)}
                  disabled={actionLoading}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="overlay__confirm-btn overlay__confirm-btn--confirm"
                  onClick={() => handleMoveTable(confirmMove.tableId)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "MOVING..." : "CONFIRM MOVE"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
