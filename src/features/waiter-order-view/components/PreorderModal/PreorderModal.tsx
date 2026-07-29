import { useEffect, useState } from "react"
import { getCurrencySymbol } from "@/features/menu/utils"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { cancelPreorder, fetchPreorder } from "../../api"
import type { Preorder, ReservationItem } from "../../types"
import { formatTimeRange } from "../../types"
import { useWaiterStrings } from "../../strings"
import "./PreorderModal.css"

interface PreorderModalProps {
  reservation: ReservationItem
  onClose: () => void
  // Tells the caller this reservation's pre-order is gone, so it can hide
  // the entry point without re-fetching the whole reservation list.
  onCancelled: () => void
}

export function PreorderModal({ reservation, onClose, onCancelled }: PreorderModalProps) {
  const waiterStrings = useWaiterStrings()
  const strings = waiterStrings.preorderModal
  const dialogRef = useFocusTrap<HTMLDivElement>({ onEscape: onClose })

  // undefined = still loading, null = loaded and there's none.
  const [preorder, setPreorder] = useState<Preorder | null | undefined>(undefined)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    fetchPreorder(reservation.public_id)
      .then((p) => {
        if (!stale) setPreorder(p)
      })
      .catch(() => {
        if (!stale) setPreorder(null)
      })
    return () => {
      stale = true
    }
  }, [reservation.public_id])

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelPreorder(reservation.public_id)
      onCancelled()
      onClose()
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : strings.cancelError)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div
      className="preorder-modal"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !cancelling) onClose()
      }}
    >
      <div
        className="preorder-modal__dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preorder-modal-title"
      >
        <div className="preorder-modal__header">
          <div>
            <h2 id="preorder-modal-title" className="preorder-modal__title">
              {strings.title}
            </h2>
            <p className="preorder-modal__subtitle">
              {reservation.name} &middot; {reservation.table} &middot;{" "}
              {formatTimeRange(reservation.start_at, reservation.end_at)}
            </p>
          </div>
          <button
            type="button"
            className="preorder-modal__close"
            onClick={onClose}
            disabled={cancelling}
            aria-label={waiterStrings.common.close}
          >
            &times;
          </button>
        </div>

        <div className="preorder-modal__body">
          {preorder === undefined ? (
            <p className="preorder-modal__hint">{strings.loading}</p>
          ) : preorder === null ? (
            <p className="preorder-modal__hint">{strings.empty}</p>
          ) : (
            <ul className="preorder-modal__list">
              {preorder.items.map((item, i) => (
                <li key={i} className="preorder-modal__item">
                  <span className="preorder-modal__item-name">
                    {item.quantity}&times; {item.name}
                  </span>
                  <span className="preorder-modal__item-price">
                    {item.totalPrice.toFixed(2)} {getCurrencySymbol(preorder.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {cancelError && (
            <p className="preorder-modal__error" role="alert">
              {cancelError}
            </p>
          )}
        </div>

        {preorder && (
          <div className="preorder-modal__footer">
            <div className="preorder-modal__total-row">
              <span>{strings.total}</span>
              <span>
                {preorder.total.toFixed(2)} {getCurrencySymbol(preorder.currency)}
              </span>
            </div>
            <div className="preorder-modal__actions">
              <button
                type="button"
                className="preorder-modal__btn"
                onClick={onClose}
                disabled={cancelling}
              >
                {waiterStrings.common.close}
              </button>
              {preorder.canCancel ? (
                <button
                  type="button"
                  className="preorder-modal__btn preorder-modal__btn--danger"
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                >
                  {cancelling ? strings.cancelling : strings.cancel}
                </button>
              ) : (
                <span className="preorder-modal__locked">{strings.locked}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
