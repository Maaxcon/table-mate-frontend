import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { LuBanknote, LuCreditCard, LuMapPin, LuPhone, LuX } from "react-icons/lu"
import type { HistoryEntry } from "../../types"
import { formatDateTime, formatMoney } from "../../utils"
import "./ReceiptDialog.css"

type ReceiptDialogProps = {
  entry: HistoryEntry
  onClose: () => void
}

export function ReceiptDialog({ entry, onClose }: ReceiptDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const itemCount = entry.items.reduce((n, i) => n + i.quantity, 0)
  const money = (amount: number) => formatMoney(amount, entry.currency)

  // Render to <body> so an ancestor transform can't anchor this fixed overlay.
  return createPortal(
    <div className="receipt-dialog__overlay">
      <div
        className="receipt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-dialog-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="receipt-dialog__close"
          onClick={onClose}
          aria-label="Close receipt"
        >
          <LuX aria-hidden="true" />
        </button>

        <div className="receipt-dialog__cover">
          <img
            className="receipt-dialog__cover-img"
            src={entry.restaurantImage}
            alt={entry.restaurantName}
          />
          <h2 className="receipt-dialog__title" id="receipt-dialog-title">
            {entry.restaurantName}
          </h2>
        </div>

        <div className="receipt-dialog__scroll">
          <header className="receipt-dialog__brand">
            <p className="receipt-dialog__brand-line">
              <LuMapPin aria-hidden="true" /> {entry.restaurantAddress}
            </p>
            <p className="receipt-dialog__brand-line">
              <LuPhone aria-hidden="true" /> {entry.restaurantPhone}
            </p>
          </header>

          <div className="receipt-dialog__divider" />

          <dl className="receipt-dialog__meta">
            <div>
              <dt>Receipt</dt>
              <dd>{entry.orderNumber}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDateTime(entry.date)}</dd>
            </div>
            <div>
              <dt>Table</dt>
              <dd>{entry.tableLabel}</dd>
            </div>
            <div>
              <dt>Server</dt>
              <dd>{entry.server}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{entry.guests}</dd>
            </div>
          </dl>

          <div className="receipt-dialog__divider receipt-dialog__divider--dashed" />

          <ul className="receipt-dialog__items">
            {entry.items.map((item, index) => (
              <li className="receipt-line" key={index}>
                <span className="receipt-line__qty">{item.quantity}×</span>
                <span className="receipt-line__name">
                  {item.name}
                  <span className="receipt-line__unit">{money(item.unitPrice)} each</span>
                </span>
                <span className="receipt-line__price">{money(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="receipt-dialog__divider receipt-dialog__divider--dashed" />

          <div className="receipt-dialog__totals">
            <div className="receipt-row">
              <span>Subtotal ({itemCount} items)</span>
              <span>{money(entry.subtotal)}</span>
            </div>
            <div className="receipt-row">
              <span>Tax</span>
              <span>{money(entry.tax)}</span>
            </div>
            <div className="receipt-row">
              <span>Service charge</span>
              <span>{money(entry.serviceCharge)}</span>
            </div>
            <div className="receipt-row">
              <span>Tip</span>
              <span>{money(entry.tip)}</span>
            </div>
            <div className="receipt-row receipt-row--grand">
              <span>Total</span>
              <span>{money(entry.total)}</span>
            </div>
          </div>

          <div className="receipt-dialog__payment">
            <span className="receipt-dialog__pay-method">
              {entry.paymentMethod === "card" ? (
                <LuCreditCard aria-hidden="true" />
              ) : (
                <LuBanknote aria-hidden="true" />
              )}
              {entry.paymentMethod === "card" ? "Card" : "Cash"}
            </span>
            <span className="receipt-dialog__pay-status">{entry.paymentStatus}</span>
          </div>

          <p className="receipt-dialog__thanks">Thank you for dining with us!</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
