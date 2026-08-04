import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import {
  LuCalendarPlus,
  LuCircleCheck,
  LuClock,
  LuFlame,
  LuPencil,
  LuReceiptText,
  LuUsers,
  LuUtensilsCrossed,
  LuX,
} from "react-icons/lu"
import { useNavigate } from "react-router-dom"
import { getPreorderChipStatus, type PreorderChipStatus } from "@/utils/preorderStatus"
import { PreorderDialog } from "@/features/cabinet/components/PreorderDialog/PreorderDialog"
import { ReceiptDialog } from "@/features/cabinet/components/ReceiptDialog/ReceiptDialog"
import { fetchMyReceipts } from "@/features/cabinet/api"
import type { HistoryEntry } from "@/features/cabinet/types"
import { formatMoney } from "@/features/cabinet/utils"
import type { ReservationStatus, ReservationWithTable, WorkingHoursDay } from "./api"
import { cancelReservation, fetchMyReservations } from "./api"
import { BookingsSkeleton } from "./BookingSkeleton"
import { CancellationConfirmationModal } from "./CancellationConfirmationModal"
import { downloadReservationIcs } from "./ics"
import { RescheduleModal } from "./RescheduleModal"
import { useBookStrings } from "./strings"
import { formatTimeInTz, safeTimeZone } from "./utils"
import "./ActiveBookings.css"

interface ActiveBookingsProps {
  reservations: ReservationWithTable[]
  loading: boolean
  workingHours: Record<string, WorkingHoursDay> | null
  timeZone: string | null
  restaurantId?: string
  onRefresh: () => void
  onBrowseTables?: () => void
}

// All times are formatted in the restaurant's timezone (not the browser's), so a
// guest in another zone still sees the correct local booking time.
function dateParts(iso: string, timeZone: string | null) {
  const d = new Date(iso)
  const tz = safeTimeZone(timeZone) ?? undefined
  return {
    day: d.toLocaleDateString("uk-UA", { timeZone: tz, day: "numeric" }),
    month: d.toLocaleDateString("uk-UA", { timeZone: tz, month: "short" }).replace(".", ""),
    weekday: d.toLocaleDateString("uk-UA", { timeZone: tz, weekday: "short" }),
  }
}

type TemporalPhase = "upcoming" | "in_progress" | "past"

function getTemporalPhase(startAt: string, endAt: string): TemporalPhase {
  const now = new Date()
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (now < start) return "upcoming"
  if (now >= start && now <= end) return "in_progress"
  return "past"
}

const STATUS_ORDER: ReservationStatus[] = ["pending", "active"]

const PREORDER_ICONS: Record<PreorderChipStatus, ReactElement> = {
  paid: <LuUtensilsCrossed aria-hidden="true" />,
  cooking: <LuFlame aria-hidden="true" />,
  ready: <LuCircleCheck aria-hidden="true" />,
}

const byStartAsc = (a: ReservationWithTable, b: ReservationWithTable) =>
  new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
const byStartDesc = (a: ReservationWithTable, b: ReservationWithTable) =>
  new Date(b.start_at).getTime() - new Date(a.start_at).getTime()

export function ActiveBookings({
  reservations,
  loading,
  workingHours,
  timeZone,
  restaurantId,
  onRefresh,
  onBrowseTables,
}: ActiveBookingsProps) {
  const bookStrings = useBookStrings()
  const navigate = useNavigate()
  const PHASE_LABELS: Record<TemporalPhase, string> = bookStrings.myBookings.phase
  const STATUS_LABELS: Record<ReservationStatus, string> = bookStrings.myBookings.status
  const PREORDER_LABELS: Record<PreorderChipStatus, string> = {
    paid: bookStrings.myBookings.actions.preorderPaid,
    cooking: bookStrings.myBookings.actions.preorderCooking,
    ready: bookStrings.myBookings.actions.preorderReady,
  }
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<ReservationWithTable | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationWithTable | null>(null)
  const [preorderTarget, setPreorderTarget] = useState<ReservationWithTable | null>(null)
  const [receiptTarget, setReceiptTarget] = useState<HistoryEntry | null>(null)
  // Receipts keyed by the booking they came from — a past booking shows its
  // own receipt without the guest hunting for it in the cabinet.
  const [receipts, setReceipts] = useState<Map<string, HistoryEntry>>(new Map())
  const [showPast, setShowPast] = useState(false)

  // History (completed/cancelled) is a separate, lazy-loaded list: the /my/
  // endpoint only returns active bookings unless asked for ?status=past.
  const [pastItems, setPastItems] = useState<ReservationWithTable[]>([])
  // Held until the first history fetch resolves so the empty state doesn't flash
  // before we know whether the guest has any past bookings.
  const [pastLoading, setPastLoading] = useState(true)

  // Guards the history fetch from setting state after the tab unmounts.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadPast = useCallback(() => {
    fetchMyReservations(restaurantId, "past")
      .then((data) => {
        if (mountedRef.current) setPastItems([...data].sort(byStartDesc))
      })
      .catch(() => {
        if (mountedRef.current) setPastItems([])
      })
      .finally(() => {
        if (mountedRef.current) setPastLoading(false)
      })
  }, [restaurantId])

  useEffect(() => {
    loadPast()
  }, [loadPast])

  useEffect(() => {
    fetchMyReceipts()
      .then((entries) => {
        if (!mountedRef.current) return
        setReceipts(
          new Map(
            entries
              .filter(
                (e): e is HistoryEntry & { reservationId: string } => e.reservationId !== null,
              )
              .map((e) => [e.reservationId, e]),
          ),
        )
      })
      .catch(() => {})
  }, [])

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return
    setError(null)
    setActionId(cancelTarget.public_id)
    try {
      await cancelReservation(cancelTarget.public_id)
      setCancelTarget(null)
      onRefresh()
      loadPast()
    } catch (err) {
      setError(err instanceof Error ? err.message : bookStrings.myBookings.cancelFailed)
    } finally {
      setActionId(null)
    }
  }, [cancelTarget, onRefresh, loadPast])

  const byStatus = useMemo(() => {
    const grouped: Record<string, ReservationWithTable[]> = {}
    for (const s of STATUS_ORDER) {
      const bucket = reservations.filter((r) => r.status === s)
      if (bucket.length === 0) continue
      grouped[s] = bucket.sort(byStartAsc)
    }
    return grouped
  }, [reservations])

  const hasActive = Object.keys(byStatus).length > 0
  const hasPast = pastItems.length > 0

  // Only flag the timezone when the guest's device clock differs from the venue.
  const foreignTz = useMemo(() => {
    if (!timeZone) return null
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return browserTz === timeZone ? null : timeZone
  }, [timeZone])

  const renderCard = useCallback(
    (r: ReservationWithTable, statusKey: ReservationStatus, withActions: boolean) => {
      const dp = dateParts(r.start_at, timeZone)
      const startTime = formatTimeInTz(r.start_at, timeZone)
      const endTime = formatTimeInTz(r.end_at, timeZone)
      const isBusy = actionId === r.public_id
      const phase = getTemporalPhase(r.start_at, r.end_at)
      const preorderStatus = getPreorderChipStatus(r)
      const receipt = receipts.get(r.public_id)
      const preorderSummary = [
        r.preorder_items_count
          ? bookStrings.myBookings.actions.preorderDishes(r.preorder_items_count)
          : null,
        r.preorder_total && r.preorder_currency
          ? formatMoney(Number(r.preorder_total), r.preorder_currency)
          : null,
      ]
        .filter(Boolean)
        .join(" · ")

      return (
        <article key={r.public_id} className={`ab__card${withActions ? "" : " ab__card--past"}`}>
          <div className={`ab__date ab__date--${statusKey}`}>
            <span className="ab__date-month">{dp.month}</span>
            <span className="ab__date-day">{dp.day}</span>
            <span className="ab__date-weekday">{dp.weekday}</span>
          </div>

          <div className="ab__card-main">
            <div className="ab__card-top">
              <span className="ab__card-table">
                {bookStrings.myBookings.card.table(r.table_info?.public_number ?? r.table)}
              </span>
              <span className={`ab__card-status ab__card-status--${statusKey}`}>
                {STATUS_LABELS[statusKey]}
              </span>
            </div>

            <div className="ab__card-meta">
              <span className="ab__meta">
                <LuClock aria-hidden="true" />
                {startTime}&ndash;{endTime}
              </span>
              <span className="ab__meta">
                <LuUsers aria-hidden="true" />
                {r.guest_count}
              </span>
              {withActions && phase !== "past" && statusKey === "active" && (
                <span className="ab__meta ab__meta--phase">{PHASE_LABELS[phase]}</span>
              )}
            </div>

            {!withActions && receipt && (
              <div className="ab__card-actions">
                <button
                  className="ab__action ab__action--receipt"
                  onClick={() => setReceiptTarget(receipt)}
                  type="button"
                >
                  <LuReceiptText aria-hidden="true" />
                  {bookStrings.myBookings.actions.receipt}
                </button>
              </div>
            )}

            {withActions && (
              <div className="ab__card-actions">
                {r.has_preorder ? (
                  <button
                    className={`ab__action ab__action--preorder ab__action--preorder-${preorderStatus}`}
                    onClick={() => setPreorderTarget(r)}
                    type="button"
                  >
                    {PREORDER_ICONS[preorderStatus]}
                    {PREORDER_LABELS[preorderStatus]}
                    {preorderSummary && (
                      <span className="ab__action-note">&middot; {preorderSummary}</span>
                    )}
                  </button>
                ) : (
                  r.can_preorder &&
                  r.restaurant && (
                    <button
                      className="ab__action ab__action--preorder"
                      onClick={() => navigate(`/menu/${r.restaurant}?reservation=${r.public_id}`)}
                      disabled={isBusy}
                      type="button"
                    >
                      <LuUtensilsCrossed aria-hidden="true" />
                      {bookStrings.myBookings.actions.preorder}
                    </button>
                  )
                )}
                <button
                  className="ab__action ab__action--edit ab__action--cta"
                  onClick={() => setRescheduleTarget(r)}
                  disabled={isBusy}
                  type="button"
                >
                  <LuPencil aria-hidden="true" />
                  {bookStrings.myBookings.actions.modify}
                </button>
                <button
                  className="ab__action ab__action--cancel"
                  onClick={() => setCancelTarget(r)}
                  disabled={isBusy}
                  type="button"
                >
                  <LuX aria-hidden="true" />
                  {isBusy
                    ? bookStrings.myBookings.actions.cancelling
                    : bookStrings.myBookings.actions.cancel}
                </button>
                <button
                  className="ab__action ab__action--calendar"
                  onClick={() =>
                    downloadReservationIcs({
                      tableNumber: r.table_info?.public_number ?? r.table,
                      startISO: r.start_at,
                      endISO: r.end_at,
                      guests: r.guest_count,
                      summary: bookStrings.modal.title(r.table_info?.public_number ?? r.table),
                      guestsLabel: bookStrings.modal.summary.guests,
                    })
                  }
                  type="button"
                >
                  <LuCalendarPlus aria-hidden="true" />
                  {bookStrings.modal.ticket.addToCalendar}
                </button>
              </div>
            )}
          </div>
        </article>
      )
    },
    [actionId, timeZone, receipts],
  )

  if (loading) {
    return <BookingsSkeleton />
  }

  return (
    <div className="ab">
      <h2 className="ab__title">{bookStrings.myBookings.title}</h2>

      {error && <p className="ab__error">{error}</p>}

      {foreignTz && (hasActive || hasPast) && (
        <p className="ab__tznote">{bookStrings.myBookings.tzNote(foreignTz)}</p>
      )}

      {!hasActive && !hasPast && !pastLoading && (
        <div className="ab__empty-state">
          <p className="ab__empty">{bookStrings.myBookings.empty}</p>
          {onBrowseTables && (
            <button type="button" className="ab__empty-cta" onClick={onBrowseTables}>
              <LuCalendarPlus aria-hidden="true" />
              {bookStrings.myBookings.emptyCta}
            </button>
          )}
        </div>
      )}

      {rescheduleTarget && (
        <RescheduleModal
          publicId={rescheduleTarget.public_id}
          tableNumber={rescheduleTarget.table_info?.public_number ?? rescheduleTarget.table}
          tablePublicId={rescheduleTarget.table_info?.public_id ?? rescheduleTarget.table}
          restaurantId={rescheduleTarget.restaurant}
          currentStart={rescheduleTarget.start_at}
          currentEnd={rescheduleTarget.end_at}
          currentGuests={rescheduleTarget.guest_count}
          tableCapacity={rescheduleTarget.table_info?.capacity ?? 10}
          workingHours={workingHours}
          timeZone={timeZone}
          endTimeOnly={rescheduleTarget.status === "active"}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={onRefresh}
        />
      )}

      {preorderTarget && (
        <PreorderDialog
          booking={preorderTarget}
          onClose={() => setPreorderTarget(null)}
          onCancelled={onRefresh}
        />
      )}

      {receiptTarget && (
        <ReceiptDialog entry={receiptTarget} onClose={() => setReceiptTarget(null)} />
      )}

      {cancelTarget && (
        <CancellationConfirmationModal
          isSubmitting={actionId === cancelTarget.public_id}
          onConfirm={() => void handleCancel()}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {STATUS_ORDER.map((statusKey) => {
        const items = byStatus[statusKey]
        if (!items) return null
        return (
          <div key={statusKey}>
            <h3 className="ab__subtitle">{STATUS_LABELS[statusKey]}</h3>
            <div className="ab__list">{items.map((r) => renderCard(r, statusKey, true))}</div>
          </div>
        )
      })}

      {hasPast && (
        <div className="ab__past">
          <button
            type="button"
            className="ab__past-toggle"
            onClick={() => setShowPast((s) => !s)}
            aria-expanded={showPast}
          >
            {showPast
              ? bookStrings.myBookings.pastHide
              : bookStrings.myBookings.pastShow(pastItems.length)}
          </button>
          {showPast && (
            <div className="ab__list">{pastItems.map((r) => renderCard(r, r.status, false))}</div>
          )}
        </div>
      )}
    </div>
  )
}
