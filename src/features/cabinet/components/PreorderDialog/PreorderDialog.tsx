import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { LuFlame, LuPlus, LuTrash2, LuUtensilsCrossed, LuX } from "react-icons/lu"
import { useNavigate } from "react-router-dom"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { serverErrorMessage } from "@/utils/serverError"
import { cancelPreorder, cancelPreorderItem, fetchPreorder } from "@/features/cabinet/api"
import { useCabinetStrings } from "@/features/cabinet/strings"
import type { Preorder } from "@/features/cabinet/types"
import { formatDateTime, formatMoney } from "@/features/cabinet/utils"
import "./PreorderDialog.css"

// Only the fields the dialog reads, so both the cabinet booking list and the
// booking page's "My bookings" tab can pass their own reservation shape.
export type PreorderDialogBooking = {
  public_id: string
  restaurant: string
  table: string | null
  table_info?: { public_number: string }
  restaurant_info?: { name: string }
  start_at: string
  status: string
}

type PreorderDialogProps = {
  booking: PreorderDialogBooking
  onClose: () => void
  // Tells the parent list this booking's pre-order is gone, so it can hide
  // the entry point without re-fetching the whole booking list.
  onCancelled: () => void
}

export function PreorderDialog({ booking, onClose, onCancelled }: PreorderDialogProps) {
  const strings = useCabinetStrings()
  const navigate = useNavigate()
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })

  // undefined = still loading, null = loaded and there's none.
  const [preorder, setPreorder] = useState<Preorder | null | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    fetchPreorder(booking.public_id)
      .then((p) => {
        if (!stale) setPreorder(p)
      })
      .catch(() => {
        if (!stale) setLoadError(strings.bookings.preorderLoadError)
      })
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch on a different booking
  }, [booking.public_id])

  // The server refuses the whole pre-order once the kitchen has started any
  // round of it, and says so — better than "try again", which never works from
  // that point on. Re-read the pre-order after a refusal so the button locks.
  const handleCancel = async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelPreorder(booking.public_id)
      onCancelled()
      onClose()
    } catch (err) {
      setCancelError(serverErrorMessage(err, strings.bookings.preorderCancelError))
      fetchPreorder(booking.public_id)
        .then(setPreorder)
        .catch(() => {})
    } finally {
      setCancelling(false)
    }
  }

  // Dropping the last dish takes the whole round with it, and the server
  // answers 204 — same end state as cancelling, so close and tell the list.
  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId)
    setCancelError(null)
    try {
      const updated = await cancelPreorderItem(booking.public_id, itemId)
      if (updated === null) {
        onCancelled()
        onClose()
        return
      }
      setPreorder(updated)
    } catch (err) {
      setCancelError(serverErrorMessage(err, strings.bookings.preorderItemRemoveError))
      fetchPreorder(booking.public_id)
        .then(setPreorder)
        .catch(() => {})
    } finally {
      setRemovingItemId(null)
    }
  }

  const tableNumber =
    booking.table_info?.public_number ?? booking.table ?? strings.bookings.unknownTable
  const restaurantName = booking.restaurant_info?.name ?? strings.bookings.fallbackRestaurant
  const itemCount = preorder?.items.reduce((n, i) => n + i.quantity, 0) ?? 0

  return createPortal(
    <div className="preorder-dialog__overlay">
      <button
        type="button"
        className="preorder-dialog__backdrop"
        aria-label={strings.receipt.closeAria}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="preorder-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preorder-dialog-title"
      >
        <button
          type="button"
          className="preorder-dialog__close"
          onClick={onClose}
          aria-label={strings.receipt.closeAria}
        >
          <LuX aria-hidden="true" />
        </button>

        <header className="preorder-dialog__header">
          <span className="preorder-dialog__eyebrow">{strings.bookings.preorderEyebrow}</span>
          <h2 className="preorder-dialog__title" id="preorder-dialog-title">
            {restaurantName}
          </h2>
          <p className="preorder-dialog__subtitle">
            {strings.bookings.tableLabel(tableNumber)} &middot;{" "}
            {formatDateTime(booking.start_at, strings.locale)}
          </p>
        </header>

        <div className="preorder-dialog__scroll">
          {loadError ? (
            <p className="preorder-dialog__error">{loadError}</p>
          ) : preorder === undefined ? (
            <p className="preorder-dialog__hint">{strings.bookings.preorderLoading}</p>
          ) : preorder === null ? (
            <p className="preorder-dialog__hint">{strings.bookings.preorderEmpty}</p>
          ) : (
            <>
              <div className="preorder-dialog__divider preorder-dialog__divider--dashed" />

              <ul className="preorder-dialog__items">
                {preorder.items.map((item) => (
                  <li className="preorder-line" key={item.id}>
                    <span className="preorder-line__qty">{item.quantity}&times;</span>
                    <span className="preorder-line__name">{item.name}</span>
                    <span className="preorder-line__price">
                      {formatMoney(item.totalPrice, preorder.currency)}
                    </span>
                    {preorder.canCancel && (
                      <button
                        type="button"
                        className="preorder-line__remove"
                        onClick={() => void handleRemoveItem(item.id)}
                        disabled={removingItemId !== null || cancelling}
                        aria-label={strings.bookings.preorderItemRemove(item.name)}
                      >
                        <LuTrash2 aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="preorder-dialog__divider preorder-dialog__divider--dashed" />

              <div className="preorder-dialog__totals">
                <div className="preorder-row">
                  <span>{strings.receipt.subtotal(itemCount)}</span>
                  <span>{formatMoney(preorder.subtotal, preorder.currency)}</span>
                </div>
                <div className="preorder-row">
                  <span>{strings.receipt.tax}</span>
                  <span>{formatMoney(preorder.tax, preorder.currency)}</span>
                </div>
                <div className="preorder-row">
                  <span>{strings.receipt.serviceCharge}</span>
                  <span>{formatMoney(preorder.serviceCharge, preorder.currency)}</span>
                </div>
                <div className="preorder-row preorder-row--grand">
                  <span>{strings.receipt.total}</span>
                  <span>{formatMoney(preorder.total, preorder.currency)}</span>
                </div>
              </div>

              <div
                className={`preorder-dialog__status${preorder.isCooking ? " preorder-dialog__status--cooking" : ""}`}
              >
                {preorder.isCooking ? (
                  <LuFlame aria-hidden="true" />
                ) : (
                  <LuUtensilsCrossed aria-hidden="true" />
                )}
                {preorder.isCooking
                  ? strings.bookings.preorderCookingBadge
                  : strings.bookings.preorderPaidBadge}
              </div>

              {booking.status === "pending" && (
                <button
                  type="button"
                  className="preorder-dialog__add"
                  onClick={() =>
                    navigate(`/menu/${booking.restaurant}?reservation=${booking.public_id}`)
                  }
                >
                  <LuPlus aria-hidden="true" />
                  {strings.bookings.preorderAddMore}
                </button>
              )}

              {cancelError && <p className="preorder-dialog__error">{cancelError}</p>}

              {preorder.canCancel ? (
                <button
                  type="button"
                  className="preorder-dialog__cancel"
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                >
                  {cancelling
                    ? strings.bookings.preorderCancelling
                    : strings.bookings.preorderCancel}
                </button>
              ) : (
                <p className="preorder-dialog__locked">
                  {preorder.isCooking
                    ? strings.bookings.preorderLocked
                    : strings.bookings.preorderOwnerOnly}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
