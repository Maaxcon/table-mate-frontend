import { useState } from "react"
import { LuClock3, LuFlame, LuTable2, LuUsers, LuUtensilsCrossed } from "react-icons/lu"
import type { ReservationItem } from "../../types"
import { formatDateGroupLabel, formatTimeRange, groupReservationsByDate } from "../../types"
import { ConfirmCancelModal } from "../ConfirmCancelModal"
import { PreorderModal } from "../PreorderModal/PreorderModal"
import "./ReservationSidebar.css"
import { useWaiterStrings } from "../../strings"

interface ReservationSidebarProps {
  reservations: ReservationItem[]
  currentTime: Date
  onCancel: (reservationId: string) => void
  onModify: (reservation: ReservationItem) => void
  actionLoading: boolean
  error?: string | null
}

export function ReservationSidebar({
  reservations,
  currentTime,
  onCancel,
  onModify,
  actionLoading,
  error = null,
}: ReservationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const waiterStrings = useWaiterStrings()
  const sidebarStrings = waiterStrings.reservations.sidebar

  const [viewingPreorder, setViewingPreorder] = useState<ReservationItem | null>(null)
  // Reservations whose pre-order was just cancelled — hides the entry point
  // without needing to re-fetch the whole reservation list.
  const [cancelledPreorderIds, setCancelledPreorderIds] = useState<Set<string>>(new Set())

  const getReservationStatusLabel = (status?: ReservationItem["status"]) => {
    if (!status) return sidebarStrings.status.unknown
    const key = status.toLowerCase() as keyof typeof sidebarStrings.status
    return sidebarStrings.status[key] ?? sidebarStrings.status.unknown
  }

  const sorted = [...reservations].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  )

  const filtered = sorted.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const dateGroups = groupReservationsByDate(filtered, currentTime)

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
        {dateGroups.map(([groupKey, items]) => (
          <div key={groupKey} className="reservation-sidebar__date-group">
            <span className="reservation-sidebar__date-heading">
              {formatDateGroupLabel(
                groupKey,
                waiterStrings.common.today,
                waiterStrings.common.tomorrow,
                waiterStrings.locale,
              )}
            </span>
            {items.map((r) => {
              const showsPreorder = r.has_preorder && !cancelledPreorderIds.has(r.public_id)
              const statusKey = (r.status ?? "unknown").toLowerCase()

              return (
                <div key={r.public_id} className="reservation-sidebar__item">
                  <div className="reservation-sidebar__item-header">
                    <span className="reservation-sidebar__item-name" title={r.name}>
                      {r.name}
                    </span>
                    <span
                      className={`reservation-sidebar__item-status reservation-sidebar__item-status--${statusKey}`}
                    >
                      {getReservationStatusLabel(r.status)}
                    </span>
                  </div>

                  <div className="reservation-sidebar__item-meta">
                    <span className="reservation-sidebar__meta-chip">
                      <LuClock3 size={13} aria-hidden="true" />
                      {formatTimeRange(r.start_at, r.end_at)}
                    </span>
                    <span className="reservation-sidebar__meta-chip">
                      <LuTable2 size={13} aria-hidden="true" />
                      {r.table}
                    </span>
                    <span className="reservation-sidebar__meta-chip">
                      <LuUsers size={13} aria-hidden="true" />
                      {r.guest_count}
                    </span>
                  </div>

                  {showsPreorder && (
                    <button
                      type="button"
                      className={`reservation-sidebar__preorder-chip${r.preorder_cooking ? " reservation-sidebar__preorder-chip--cooking" : ""}`}
                      onClick={() => setViewingPreorder(r)}
                    >
                      {r.preorder_cooking ? (
                        <LuFlame size={13} aria-hidden="true" />
                      ) : (
                        <LuUtensilsCrossed size={13} aria-hidden="true" />
                      )}
                      {r.preorder_cooking
                        ? sidebarStrings.preorderCooking
                        : sidebarStrings.preorderBadge}
                    </button>
                  )}

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
              )
            })}
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

      {viewingPreorder && (
        <PreorderModal
          reservation={viewingPreorder}
          onClose={() => setViewingPreorder(null)}
          onCancelled={() =>
            setCancelledPreorderIds((prev) => new Set(prev).add(viewingPreorder.public_id))
          }
        />
      )}
    </aside>
  )
}
