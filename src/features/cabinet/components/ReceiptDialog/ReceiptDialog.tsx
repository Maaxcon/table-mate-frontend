import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import {
  LuBanknote,
  LuChevronRight,
  LuCreditCard,
  LuDownload,
  LuMapPin,
  LuPhone,
  LuShare2,
  LuX,
} from "react-icons/lu"
import type { HistoryEntry } from "../../types"
import { loadReceiptFont } from "../../receiptFont"
import { buildReceiptPdf } from "../../receiptPdf"
import { formatDateTime, formatMoney } from "../../utils"
import { FeedbackDialog } from "../FeedbackDialog/FeedbackDialog"
import "./ReceiptDialog.css"

type ReceiptDialogProps = {
  entry: HistoryEntry
  onClose: () => void
}

// Can this device share files (mobile)? If yes we use the native share sheet,
// otherwise we just download the PDF (desktop).
function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false
  try {
    const probe = new File([new Blob()], "probe.pdf", { type: "application/pdf" })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

export function ReceiptDialog({ entry, onClose }: ReceiptDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const shareMode = useMemo(() => canShareFiles(), [])
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openMenu = () => {
    if (!entry.restaurantId) return
    onClose()
    navigate(`/menu/${entry.restaurantId}`)
  }

  useEffect(() => {
    closeRef.current?.focus()
    // Preload the PDF font so saving/sharing later feels instant.
    void loadReceiptFont()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const itemCount = entry.items.reduce((n, i) => n + i.quantity, 0)
  const money = (amount: number) => formatMoney(amount, entry.currency)

  const handleSaveOrShare = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { blob, filename } = await buildReceiptPdf(entry)

      // Mobile: open the native share sheet with the PDF file.
      if (shareMode) {
        const file = new File([blob], filename, { type: "application/pdf" })
        try {
          await navigator.share({ files: [file], title: filename })
        } catch {
          // user cancelled the share sheet — not an error
        }
        return
      }

      // Desktop: download the PDF.
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError("Could not create the PDF. Please check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

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

        <button
          type="button"
          className="receipt-dialog__cover"
          onClick={openMenu}
          aria-label={`Open ${entry.restaurantName} menu`}
        >
          <img className="receipt-dialog__cover-img" src={entry.restaurantImage} alt="" />
          <span className="receipt-dialog__title" id="receipt-dialog-title">
            {entry.restaurantName}
          </span>
          <span className="receipt-dialog__cover-cta">
            View menu <LuChevronRight aria-hidden="true" />
          </span>
        </button>

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

          <button
            type="button"
            className="receipt-dialog__action"
            onClick={() => void handleSaveOrShare()}
            disabled={busy}
          >
            {shareMode ? <LuShare2 aria-hidden="true" /> : <LuDownload aria-hidden="true" />}
            {busy ? "Preparing…" : shareMode ? "Share receipt" : "Save PDF"}
          </button>

          <p className="receipt-dialog__thanks">Thank you for dining with us!</p>
        </div>
      </div>

      {error && (
        <FeedbackDialog
          variant="error"
          title="Something went wrong"
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </div>,
    document.body,
  )
}
